package config

import (
	"slices"
	"testing"
)

func TestWithScheme(t *testing.T) {
	cases := []struct{ in, fallback, want string }{
		{"monolith:1500", "", "http://monolith:1500"},             // Render hostport
		{"http://monolith:1500", "", "http://monolith:1500"},      // docker-compose
		{"HTTPS://api.example.com", "", "HTTPS://api.example.com"}, // scheme check is case-insensitive
		{"  ", "http://localhost:4004", "http://localhost:4004"},   // blank → fallback
		{"", "localhost:1600", "http://localhost:1600"},
	}
	for _, c := range cases {
		if got := withScheme(c.in, c.fallback); got != c.want {
			t.Errorf("withScheme(%q, %q) = %q, want %q", c.in, c.fallback, got, c.want)
		}
	}
}

func TestAllowedOrigins(t *testing.T) {
	got := allowedOrigins(" https://app.example.com ,http://localhost:3000,,", true)
	want := []string{"http://localhost:3000", "http://127.0.0.1:3000", "https://app.example.com"}
	if !slices.Equal(got, want) {
		t.Errorf("dev: got %v, want %v", got, want)
	}
	if got := allowedOrigins("https://app.example.com", false); !slices.Equal(got, []string{"https://app.example.com"}) {
		t.Errorf("prod: got %v", got)
	}
}
