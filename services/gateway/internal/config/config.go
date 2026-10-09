// Package config reads the gateway's environment — the same variables the
// Node gateway used, so .env files, docker-compose and render.yaml are unchanged.
package config

import (
	"os"
	"regexp"
	"strconv"
	"strings"
)

type Config struct {
	Port           string
	Env            string
	AllowedOrigins []string
	MonolithURL    string
	ExpenseURL     string
	SocketURL      string
	InternalSecret string
	// TrustProxyHops is how many reverse proxies sit in front of the gateway
	// (Render's edge = 1). Equivalent to Express's `trust proxy` hop count.
	TrustProxyHops int
}

func (c *Config) IsDevelopment() bool { return c.Env == "development" }

func Load() *Config {
	env := os.Getenv("NODE_ENV")
	return &Config{
		Port:           orDefault(os.Getenv("PORT"), "4000"),
		Env:            env,
		AllowedOrigins: allowedOrigins(os.Getenv("CLIENT_URL"), env == "development"),
		MonolithURL:    withScheme(os.Getenv("MONOLITH_URL"), "http://localhost:1500"),
		ExpenseURL:     withScheme(os.Getenv("EXPENSE_SERVICE_URL"), "http://localhost:4004"),
		SocketURL:      withScheme(os.Getenv("SOCKET_SERVICE_URL"), "http://localhost:1600"),
		InternalSecret: os.Getenv("INTERNAL_SECRET"),
		TrustProxyHops: atoiOr(os.Getenv("TRUST_PROXY_HOPS"), 1),
	}
}

var hasScheme = regexp.MustCompile(`(?i)^https?://`)

// withScheme exists because Render's `fromService` can only emit host:port
// (property: hostport) with no scheme, while docker-compose and .env pass full
// URLs. Normalizing here keeps render.yaml declarative.
func withScheme(value, fallback string) string {
	raw := strings.TrimSpace(orDefault(value, fallback))
	if hasScheme.MatchString(raw) {
		return raw
	}
	return "http://" + raw
}

// allowedOrigins is a port of getAllowedOrigins in packages/shared-config:
// comma-separated CLIENT_URL plus the local dev URLs in development.
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

func orDefault(v, def string) string {
	if strings.TrimSpace(v) == "" {
		return def
	}
	return v
}

func atoiOr(v string, def int) int {
	n, err := strconv.Atoi(strings.TrimSpace(v))
	if err != nil || n < 0 {
		return def
	}
	return n
}
