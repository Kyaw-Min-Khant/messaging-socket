// Package push sends FCM notifications. Port of sendMessageNotification in
// src/services/fcm_service.ts.
package push

import (
	"context"
	"encoding/json"
	"log"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"

	"github.com/kmk-mobile/messaging-socket/services/socket-go/internal/config"
)

type MessageNotification struct {
	SenderUsername string
	Body           string
	SenderID       string
	ConversationID string
	MessageType    string
}

type Sender interface {
	SendMessage(ctx context.Context, token string, n MessageNotification)
}

type FCM struct {
	client *messaging.Client
}

// NewFCM builds the same service account JSON as src/config/firebase.ts.
func NewFCM(ctx context.Context, fb config.FirebaseConfig) (*FCM, error) {
	creds, err := json.Marshal(map[string]string{
		"type":                        "service_account",
		"project_id":                  fb.ProjectID,
		"private_key_id":              fb.PrivateKeyID,
		"private_key":                 fb.PrivateKey,
		"client_email":                fb.ClientEmail,
		"client_id":                   fb.ClientID,
		"auth_uri":                    "https://accounts.google.com/o/oauth2/auth",
		"token_uri":                   "https://oauth2.googleapis.com/token",
		"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
		"client_x509_cert_url":        "https://www.googleapis.com/robot/v1/metadata/x509/" + fb.ClientEmail,
	})
	if err != nil {
		return nil, err
	}
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: fb.ProjectID},
		option.WithCredentialsJSON(creds))
	if err != nil {
		return nil, err
	}
	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, err
	}
	return &FCM{client: client}, nil
}

// SendMessage logs failures instead of returning them, like the Node version.
func (f *FCM) SendMessage(ctx context.Context, token string, n MessageNotification) {
	badge := 1
	_, err := f.client.Send(ctx, &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title: n.SenderUsername,
			Body:  n.Body,
		},
		Data: map[string]string{
			"type":           "message",
			"senderId":       n.SenderID,
			"senderUsername": n.SenderUsername,
			"conversationId": n.ConversationID,
			"messageType":    n.MessageType,
		},
		Android: &messaging.AndroidConfig{
			Priority: "high",
			Notification: &messaging.AndroidNotification{
				Sound:     "default",
				ChannelID: "messages",
			},
		},
		APNS: &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{Sound: "default", Badge: &badge},
			},
		},
	})
	if err != nil {
		log.Printf("FCM send failed: %v", err)
	}
}

// Noop is used when Firebase credentials are not configured.
type Noop struct{}

func (Noop) SendMessage(_ context.Context, _ string, n MessageNotification) {
	log.Printf("FCM disabled, skipping push from %s", n.SenderUsername)
}
