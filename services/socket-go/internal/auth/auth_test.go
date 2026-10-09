package auth

import (
	"errors"
	"net/url"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const secret = "test-secret"

func sign(t *testing.T, method jwt.SigningMethod, key any, exp time.Time) string {
	t.Helper()
	tok := jwt.NewWithClaims(method, Claims{
		UserID:   "650000000000000000000001",
		Email:    "a@example.com",
		Username: "alice",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	})
	s, err := tok.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestExtractToken(t *testing.T) {
	tests := []struct {
		name   string
		cookie string
		auth   map[string]any
		want   string
	}{
		{"none", "", nil, ""},
		{"auth only", "", map[string]any{"token": "abc"}, "abc"},
		{"cookie only", "a=1; token=xyz; b=2", nil, "xyz"},
		{"cookie wins over auth", "token=fromcookie", map[string]any{"token": "fromauth"}, "fromcookie"},
		{"cookie is url-decoded", "token=" + url.QueryEscape("a.b+c"), nil, "a.b+c"},
		{"other cookie name ignored", "mytoken=nope", nil, ""},
		{"non-string auth ignored", "", map[string]any{"token": 42}, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ExtractToken(tt.cookie, tt.auth); got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestVerify(t *testing.T) {
	valid := sign(t, jwt.SigningMethodHS256, []byte(secret), time.Now().Add(time.Hour))

	claims, err := Verify(valid, secret)
	if err != nil {
		t.Fatalf("valid token: %v", err)
	}
	if claims.UserID != "650000000000000000000001" || claims.Username != "alice" {
		t.Errorf("unexpected claims: %+v", claims)
	}

	if _, err := Verify("", secret); !errors.Is(err, ErrAuthRequired) {
		t.Errorf("empty token: got %v, want ErrAuthRequired", err)
	}
	if _, err := Verify(valid, "wrong"); !errors.Is(err, ErrInvalidToken) {
		t.Errorf("wrong secret: got %v", err)
	}
	expired := sign(t, jwt.SigningMethodHS256, []byte(secret), time.Now().Add(-time.Hour))
	if _, err := Verify(expired, secret); !errors.Is(err, ErrInvalidToken) {
		t.Errorf("expired: got %v", err)
	}
	hs512 := sign(t, jwt.SigningMethodHS512, []byte(secret), time.Now().Add(time.Hour))
	if _, err := Verify(hs512, secret); !errors.Is(err, ErrInvalidToken) {
		t.Errorf("HS512 should be rejected: got %v", err)
	}
	if _, err := Verify("garbage", secret); !errors.Is(err, ErrInvalidToken) {
		t.Errorf("garbage: got %v", err)
	}
}
