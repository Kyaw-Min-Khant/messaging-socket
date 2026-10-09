// Package auth verifies the JWT on the Socket.IO handshake. It is a port of
// the io.use middleware in src/socket/index.ts.
package auth

import (
	"errors"
	"net/url"
	"regexp"

	"github.com/golang-jwt/jwt/v5"
)

// Error messages are part of the client contract: socket.io-client surfaces
// them as connect_error.message.
var (
	ErrAuthRequired = errors.New("Authentication required")
	ErrInvalidToken = errors.New("Invalid token")
)

// Claims matches JwtPayload in src/types/index.ts, signed in src/models/User.ts.
type Claims struct {
	UserID   string `json:"userId"`
	Email    string `json:"email"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

var tokenCookie = regexp.MustCompile(`(?:^|;\s*)token=([^;]+)`)

// ExtractToken returns the token from the "token" cookie when present,
// otherwise from handshake.auth.token (used by non-browser clients).
func ExtractToken(cookieHeader string, auth map[string]any) string {
	var token string
	if t, ok := auth["token"].(string); ok {
		token = t
	}
	if m := tokenCookie.FindStringSubmatch(cookieHeader); m != nil {
		// PathUnescape matches decodeURIComponent: "+" stays "+".
		if decoded, err := url.PathUnescape(m[1]); err == nil {
			token = decoded
		} else {
			token = m[1]
		}
	}
	return token
}

// Verify checks an HS256 token and returns its claims.
func Verify(token, secret string) (*Claims, error) {
	if token == "" {
		return nil, ErrAuthRequired
	}
	claims := &Claims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(*jwt.Token) (any, error) {
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil || !parsed.Valid || claims.UserID == "" {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
