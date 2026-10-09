// Package socket registers the Socket.IO event handlers. It is a port of
// src/socket/index.ts; event names and payload shapes are the client contract
// (see docs/socket-api.md) and must not change.
package socket

import (
	"context"
	"log"
	"time"

	sio "github.com/zishang520/socket.io/servers/socket/v3"

	"github.com/kmk-mobile/messaging-socket/services/socket-go/internal/auth"
	"github.com/kmk-mobile/messaging-socket/services/socket-go/internal/presence"
	"github.com/kmk-mobile/messaging-socket/services/socket-go/internal/push"
	"github.com/kmk-mobile/messaging-socket/services/socket-go/internal/store"
)

const opTimeout = 10 * time.Second

type Handlers struct {
	io        *sio.Server
	store     *store.Store
	presence  *presence.Presence
	push      push.Sender
	jwtSecret string
}

func Register(io *sio.Server, st *store.Store, pr *presence.Presence, pu push.Sender, jwtSecret string) {
	h := &Handlers{io: io, store: st, presence: pr, push: pu, jwtSecret: jwtSecret}
	io.Use(h.authenticate)
	io.On("connection", func(args ...any) {
		h.onConnection(args[0].(*sio.Socket))
	})
}

// authenticate validates the JWT before the connection is accepted.
func (h *Handlers) authenticate(s *sio.Socket, next func(*sio.ExtendedError)) {
	hs := s.Handshake()
	token := auth.ExtractToken(hs.Headers.Header().Get("Cookie"), hs.Auth)
	claims, err := auth.Verify(token, h.jwtSecret)
	if err != nil {
		next(sio.NewExtendedError(err.Error(), nil))
		return
	}
	s.SetData(claims)
	next(nil)
}

// isUserOnline reports whether any socket (tab/device) of the user is in
// their personal room.
func (h *Handlers) isUserOnline(userID string) bool {
	done := make(chan bool, 1)
	h.io.In(sio.Room(userID)).FetchSockets()(func(sockets []*sio.RemoteSocket, err error) {
		done <- err == nil && len(sockets) > 0
	})
	return <-done
}

func (h *Handlers) onConnection(s *sio.Socket) {
	claims := s.Data().(*auth.Claims)
	userID, username := claims.UserID, claims.Username
	socketID := string(s.Id())

	// Personal room keyed by userId lets every tab/device receive events.
	s.Join(sio.Room(userID))

	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	if err := h.presence.Add(ctx, socketID, userID, username); err != nil {
		log.Printf("Error registering connected user: %v", err)
	}
	if err := h.store.SetPresence(ctx, userID, true); err != nil {
		log.Printf("Error registering connected user: %v", err)
	}
	cancel()
	log.Printf("🔌 %s connected: %s", username, socketID)

	// Kept for backward compat with existing clients.
	s.On("authenticate", func(...any) {
		s.Emit("authenticated", map[string]any{
			"user": map[string]any{"id": userID, "username": username},
		})
		s.Broadcast().Emit("userOnline", map[string]any{
			"id": userID, "username": username, "isOnline": true,
		})
	})

	s.On("sendDirectMessage", func(args ...any) {
		h.sendDirectMessage(s, userID, username, firstMap(args))
	})

	s.On("typing", func(args ...any) {
		data := firstMap(args)
		recipientID, ok := data["recipientId"].(string)
		if !ok || recipientID == "" {
			s.Emit("error", map[string]any{"message": "Invalid recipient"})
			return
		}
		h.io.To(sio.Room(recipientID)).Emit("userTyping", map[string]any{
			"senderId":       userID,
			"senderUsername": username,
			"isTyping":       data["isTyping"],
		})
	})

	s.On("markAsRead", func(args ...any) {
		data := firstMap(args)
		messageID, _ := data["messageId"].(string)
		senderID, _ := data["senderId"].(string)
		ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
		defer cancel()
		if err := h.store.MarkSeen(ctx, messageID); err != nil {
			log.Printf("❌ markAsRead error: %v", err)
			return
		}
		if senderID == "" {
			return
		}
		h.io.To(sio.Room(senderID)).Emit("messageRead", map[string]any{
			"messageId": messageID,
			"readBy":    userID,
			"readAt":    presence.ISOTime(time.Now()),
		})
	})

	s.On("disconnect", func(...any) {
		ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
		defer cancel()
		if err := h.presence.Remove(ctx, socketID); err != nil {
			log.Printf("Error on disconnect cleanup: %v", err)
		}

		// The socket has already left its rooms here; stay online if another
		// tab/device is still connected.
		if h.isUserOnline(userID) {
			log.Printf("👋 %s closed one connection: %s", username, socketID)
			return
		}

		if err := h.store.SetPresence(ctx, userID, false); err != nil {
			log.Printf("Error on disconnect cleanup: %v", err)
			return
		}
		s.Broadcast().Emit("userOffline", map[string]any{
			"id":       userID,
			"username": username,
			"isOnline": false,
			"lastSeen": presence.ISOTime(time.Now()),
		})
		log.Printf("👋 %s disconnected", username)
	})
}

func (h *Handlers) sendDirectMessage(s *sio.Socket, userID, username string, data map[string]any) {
	recipientID, ok := data["recipientId"].(string)
	if !ok || recipientID == "" {
		s.Emit("error", map[string]any{"message": "Invalid recipient"})
		return
	}
	text, _ := data["message"].(string)
	messageType, _ := data["messageType"].(string)
	if messageType == "" {
		messageType = "text"
	}

	fail := func(err error) {
		log.Printf("❌ sendDirectMessage error: %v", err)
		s.Emit("error", map[string]any{"message": "Failed to send message"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()

	conversationID, err := h.store.FindOrCreateConversation(ctx, userID, recipientID)
	if err != nil {
		fail(err)
		return
	}
	msg, err := h.store.CreateMessage(ctx, conversationID, userID, text, messageType)
	if err != nil {
		fail(err)
		return
	}

	payload := MessagePayload(msg, userID, username, recipientID, text)

	recipientOnline := h.isUserOnline(recipientID)
	if recipientOnline {
		h.io.To(sio.Room(recipientID)).Emit("newDirectMessage", withStatus(payload, "delivered"))
		if err := h.store.MarkDelivered(ctx, msg.ID); err != nil {
			fail(err)
			return
		}
	}

	s.Emit("messageSent", payload)

	// Only push if the recipient has no active socket.
	if recipientOnline {
		return
	}
	token, err := h.store.FCMToken(ctx, recipientID)
	if err != nil {
		fail(err)
		return
	}
	if token == "" {
		return
	}
	n := push.MessageNotification{
		SenderUsername: username,
		Body:           NotificationBody(messageType, text),
		SenderID:       userID,
		ConversationID: conversationID.Hex(),
		MessageType:    messageType,
	}
	// Fire and forget, like the un-awaited call in the Node version.
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
		defer cancel()
		h.push.SendMessage(ctx, token, n)
	}()
}

// MessagePayload builds the object emitted as messageSent/newDirectMessage.
// "message" is the text as the client sent it (untrimmed), as in Node.
func MessagePayload(msg *store.Message, senderID, senderUsername, recipientID, text string) map[string]any {
	return map[string]any{
		"_id":            msg.ID.Hex(),
		"conversationId": msg.Conversation.Hex(),
		"senderId":       senderID,
		"senderUsername": senderUsername,
		"recipientId":    recipientID,
		"message":        text,
		"messageType":    msg.MessageType,
		"timestamp":      presence.ISOTime(msg.CreatedAt),
		"status":         "sent",
	}
}

func NotificationBody(messageType, text string) string {
	switch messageType {
	case "audio":
		return "Sent an audio message"
	case "image":
		return "Sent an image"
	default:
		return text
	}
}

func withStatus(p map[string]any, status string) map[string]any {
	out := make(map[string]any, len(p))
	for k, v := range p {
		out[k] = v
	}
	out["status"] = status
	return out
}

func firstMap(args []any) map[string]any {
	if len(args) > 0 {
		if m, ok := args[0].(map[string]any); ok {
			return m
		}
	}
	return map[string]any{}
}
