package store

import (
	"errors"
	"strings"
	"testing"
)

func TestValidateMessage(t *testing.T) {
	tests := []struct {
		name, content, typ string
		ok                 bool
	}{
		{"text ok", "hi", "text", true},
		{"empty", "", "text", false},
		{"exactly 1000 runes", strings.Repeat("é", 1000), "text", true},
		{"too long", strings.Repeat("a", 1001), "text", false},
		{"unknown type", "hi", "video", false},
		{"image needs fileUrl", "hi", "image", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateMessage(tt.content, tt.typ)
			if tt.ok && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if !tt.ok && !errors.Is(err, ErrValidation) {
				t.Errorf("want ErrValidation, got %v", err)
			}
		})
	}
}

func TestDBName(t *testing.T) {
	cases := map[string]string{
		"mongodb://127.0.0.1:27017/messaging":         "messaging",
		"mongodb://127.0.0.1:27017/messaging?x=1":     "messaging",
		"mongodb://127.0.0.1:27017":                   "test",
		"mongodb://user:pass@h1,h2/chat?replicaSet=r": "chat",
	}
	for uri, want := range cases {
		if got := dbName(uri); got != want {
			t.Errorf("%s: got %q, want %q", uri, got, want)
		}
	}
}
