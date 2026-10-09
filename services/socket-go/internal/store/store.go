// Package store writes to the same MongoDB collections as the Mongoose models
// in src/models. Documents must stay byte-compatible with what Mongoose writes
// (ObjectId refs, createdAt/updatedAt timestamps, __v), because the Node REST
// API reads them back.
package store

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"go.mongodb.org/mongo-driver/v2/x/mongo/driver/connstring"
)

const maxContentLength = 1000

var messageTypes = []string{"text", "image", "audio", "file"}

// ErrValidation mirrors a Mongoose ValidationError.
var ErrValidation = errors.New("validation failed")

type Message struct {
	ID           bson.ObjectID `bson:"_id"`
	Conversation bson.ObjectID `bson:"conversation"`
	Sender       bson.ObjectID `bson:"sender"`
	Content      string        `bson:"content"`
	MessageType  string        `bson:"messageType"`
	Status       string        `bson:"status"`
	CreatedAt    time.Time     `bson:"createdAt"`
	UpdatedAt    time.Time     `bson:"updatedAt"`
	V            int           `bson:"__v"`
}

type Store struct {
	client        *mongo.Client
	users         *mongo.Collection
	conversations *mongo.Collection
	messages      *mongo.Collection
}

func Connect(ctx context.Context, uri string) (*Store, error) {
	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}
	// Mongoose uses the database named in the URI path.
	db := client.Database(dbName(uri))
	return &Store{
		client:        client,
		users:         db.Collection("users"),
		conversations: db.Collection("conversations"),
		messages:      db.Collection("messages"),
	}, nil
}

// dbName returns the database from the URI path, or "test" (the driver and
// Mongoose default) when there is none.
func dbName(uri string) string {
	cs, err := connstring.Parse(uri)
	if err != nil || cs.Database == "" {
		return "test"
	}
	return cs.Database
}

func (s *Store) Ping(ctx context.Context) error { return s.client.Ping(ctx, nil) }

func (s *Store) Close(ctx context.Context) error { return s.client.Disconnect(ctx) }

// SetPresence updates isOnline/lastSeen like User.findByIdAndUpdate does
// (which also bumps updatedAt because the schema has timestamps).
func (s *Store) SetPresence(ctx context.Context, userID string, online bool) error {
	id, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}
	now := time.Now()
	_, err = s.users.UpdateByID(ctx, id, bson.M{"$set": bson.M{
		"isOnline":  online,
		"lastSeen":  now,
		"updatedAt": now,
	}})
	return err
}

// FCMToken returns the user's push token, or "" if none.
func (s *Store) FCMToken(ctx context.Context, userID string) (string, error) {
	id, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return "", err
	}
	var doc struct {
		FCMToken string `bson:"fcmtoken"`
	}
	err = s.users.FindOne(ctx, bson.M{"_id": id},
		options.FindOne().SetProjection(bson.M{"fcmtoken": 1})).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return "", nil
	}
	return doc.FCMToken, err
}

// FindOrCreateConversation finds the conversation containing both users, or
// creates one. Same query as src/socket/index.ts (participants $all).
func (s *Store) FindOrCreateConversation(ctx context.Context, a, b string) (bson.ObjectID, error) {
	aID, err := bson.ObjectIDFromHex(a)
	if err != nil {
		return bson.ObjectID{}, err
	}
	bID, err := bson.ObjectIDFromHex(b)
	if err != nil {
		return bson.ObjectID{}, err
	}
	participants := bson.A{aID, bID}

	var existing struct {
		ID bson.ObjectID `bson:"_id"`
	}
	err = s.conversations.FindOne(ctx, bson.M{"participants": bson.M{"$all": participants}}).Decode(&existing)
	if err == nil {
		return existing.ID, nil
	}
	if !errors.Is(err, mongo.ErrNoDocuments) {
		return bson.ObjectID{}, err
	}

	now := time.Now()
	id := bson.NewObjectID()
	_, err = s.conversations.InsertOne(ctx, bson.D{
		{Key: "_id", Value: id},
		{Key: "participants", Value: participants},
		{Key: "unreadCount", Value: bson.M{}},
		{Key: "createdAt", Value: now},
		{Key: "updatedAt", Value: now},
		{Key: "__v", Value: 0},
	})
	return id, err
}

// CreateMessage applies the Mongoose schema rules for Message and inserts it.
func (s *Store) CreateMessage(ctx context.Context, conversation bson.ObjectID, sender, content, messageType string) (*Message, error) {
	senderID, err := bson.ObjectIDFromHex(sender)
	if err != nil {
		return nil, err
	}
	content = strings.TrimSpace(content)
	if err := validateMessage(content, messageType); err != nil {
		return nil, err
	}
	now := time.Now()
	msg := &Message{
		ID:           bson.NewObjectID(),
		Conversation: conversation,
		Sender:       senderID,
		Content:      content,
		MessageType:  messageType,
		Status:       "sent",
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if _, err := s.messages.InsertOne(ctx, msg); err != nil {
		return nil, err
	}
	return msg, nil
}

func validateMessage(content, messageType string) error {
	if content == "" {
		return fmt.Errorf("%w: Message content is required", ErrValidation)
	}
	if utf8.RuneCountInString(content) > maxContentLength {
		return fmt.Errorf("%w: Message cannot exceed 1000 characters", ErrValidation)
	}
	if !slices.Contains(messageTypes, messageType) {
		return fmt.Errorf("%w: invalid messageType %q", ErrValidation, messageType)
	}
	// The socket event carries no fileUrl, and the schema requires one for
	// non-text types, so these fail exactly as they do under Mongoose.
	if messageType != "text" {
		return fmt.Errorf("%w: fileUrl is required for %s messages", ErrValidation, messageType)
	}
	return nil
}

func (s *Store) MarkDelivered(ctx context.Context, id bson.ObjectID) error {
	_, err := s.messages.UpdateByID(ctx, id, bson.M{"$set": bson.M{
		"status":    "delivered",
		"updatedAt": time.Now(),
	}})
	return err
}

func (s *Store) MarkSeen(ctx context.Context, messageID string) error {
	id, err := bson.ObjectIDFromHex(messageID)
	if err != nil {
		return err
	}
	now := time.Now()
	_, err = s.messages.UpdateByID(ctx, id, bson.M{"$set": bson.M{
		"status":    "seen",
		"seenAt":    now,
		"updatedAt": now,
	}})
	return err
}
