package socket

import (
	"encoding/json"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/kmk-mobile/messaging-socket/services/socket-go/internal/store"
)

func TestMessagePayloadMatchesNodeShape(t *testing.T) {
	msgID, _ := bson.ObjectIDFromHex("650000000000000000000010")
	convID, _ := bson.ObjectIDFromHex("650000000000000000000020")
	msg := &store.Message{
		ID:           msgID,
		Conversation: convID,
		MessageType:  "text",
		CreatedAt:    time.Date(2026, 10, 9, 8, 30, 1, 123456789, time.FixedZone("x", 7*3600)),
	}

	p := MessagePayload(msg, "650000000000000000000001", "alice", "650000000000000000000002", " hi ")
	got, _ := json.Marshal(p)
	want := `{"_id":"650000000000000000000010","conversationId":"650000000000000000000020",` +
		`"message":" hi ","messageType":"text","recipientId":"650000000000000000000002",` +
		`"senderId":"650000000000000000000001","senderUsername":"alice","status":"sent",` +
		`"timestamp":"2026-10-09T01:30:01.123Z"}`
	if string(got) != want {
		t.Errorf("payload\n got %s\nwant %s", got, want)
	}

	delivered := withStatus(p, "delivered")
	if delivered["status"] != "delivered" || p["status"] != "sent" {
		t.Errorf("withStatus must copy, got original=%v copy=%v", p["status"], delivered["status"])
	}
}

func TestNotificationBody(t *testing.T) {
	cases := map[string]string{"audio": "Sent an audio message", "image": "Sent an image", "text": "hello", "file": "hello"}
	for typ, want := range cases {
		if got := NotificationBody(typ, "hello"); got != want {
			t.Errorf("%s: got %q, want %q", typ, got, want)
		}
	}
}
