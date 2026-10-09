// Package config reads the same environment variables as the Node monolith
// (src/config/*.ts) so both services can share one .env / Render env group.
package config

import (
	"errors"
	"os"
	"strings"
)

type Config struct {
	Port           string
	Env            string
	AllowedOrigins []string
	MongoURI       string
	RedisHost      string
	RedisPort      string
	RedisPassword  string
	JWTSecret      string
	InternalSecret string
	Firebase       FirebaseConfig
}

type FirebaseConfig struct {
	ProjectID    string
	PrivateKeyID string
	PrivateKey   string
	ClientEmail  string
	ClientID     string
}

// Enabled reports whether enough Firebase credentials are set to send pushes.
func (f FirebaseConfig) Enabled() bool {
	return f.ProjectID != "" && f.PrivateKey != "" && f.ClientEmail != ""
}

func (c *Config) IsDevelopment() bool { return c.Env == "development" }

func Load() (*Config, error) {
	env := os.Getenv("NODE_ENV")
	dev := env == "development"

	// Mirrors src/config/database.ts and src/config/redis.ts: development
	// switches to the DEV_* values.
	pick := func(prod, devKey string) string {
		if dev {
			return os.Getenv(devKey)
		}
		return os.Getenv(prod)
	}

	cfg := &Config{
		Port:           getenv("PORT", "1600"),
		Env:            env,
		AllowedOrigins: allowedOrigins(os.Getenv("CLIENT_URL"), dev),
		MongoURI:       pick("MONGODB_URI", "DEV_MONGODB_URI"),
		RedisHost:      orDefault(pick("REDIS_URL", "DEV_REDIS_URL"), "127.0.0.1"),
		RedisPort:      orDefault(pick("REDIS_PORT", "DEV_REDIS_PORT"), "6379"),
		RedisPassword:  strings.TrimSpace(pick("REDIS_PASSWORD", "DEV_REDIS_PASSWORD")),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		InternalSecret: os.Getenv("INTERNAL_SECRET"),
		Firebase: FirebaseConfig{
			ProjectID:    os.Getenv("FIREBASE_PROJECT_ID"),
			PrivateKeyID: os.Getenv("FIREBASE_PRIVATE_KEY_ID"),
			// Same as src/config/firebase.ts: env files carry literal "\n".
			PrivateKey:  strings.ReplaceAll(os.Getenv("FIREBASE_PRIVATE_KEY"), `\n`, "\n"),
			ClientEmail: os.Getenv("FIREBASE_CLIENT_EMAIL"),
			ClientID:    os.Getenv("FIREBASE_CLIENT_ID"),
		},
	}

	var missing []string
	if cfg.MongoURI == "" {
		missing = append(missing, "MONGODB_URI (or DEV_MONGODB_URI)")
	}
	if cfg.JWTSecret == "" {
		missing = append(missing, "JWT_SECRET")
	}
	if len(missing) > 0 {
		return nil, errors.New("missing required env: " + strings.Join(missing, ", "))
	}
	return cfg, nil
}

// allowedOrigins is a port of getAllowedOrigins in src/config/cors.ts.
func allowedOrigins(clientURL string, dev bool) []string {
	var out []string
	seen := map[string]bool{}
	add := func(o string) {
		if o != "" && !seen[o] {
			seen[o] = true
			out = append(out, o)
		}
	}
	if dev {
		add("http://localhost:3000")
		add("http://127.0.0.1:3000")
	}
	for _, o := range strings.Split(clientURL, ",") {
		add(strings.TrimSpace(o))
	}
	return out
}

func getenv(key, def string) string { return orDefault(os.Getenv(key), def) }

func orDefault(v, def string) string {
	if v == "" {
		return def
	}
	return v
}
