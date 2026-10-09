package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

var ok = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })

func TestCORS(t *testing.T) {
	h := CORS([]string{"https://app.example.com"})(ok)

	t.Run("allowed origin", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/v1/api/x", nil)
		r.Header.Set("Origin", "https://app.example.com")
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://app.example.com" {
			t.Errorf("Allow-Origin = %q", got)
		}
		if w.Header().Get("Access-Control-Allow-Credentials") != "true" {
			t.Error("missing Allow-Credentials")
		}
	})

	t.Run("blocked origin still reaches handler without CORS headers", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/v1/api/x", nil)
		r.Header.Set("Origin", "https://evil.example.com")
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != http.StatusOK || w.Header().Get("Access-Control-Allow-Origin") != "" {
			t.Errorf("code %d, Allow-Origin %q", w.Code, w.Header().Get("Access-Control-Allow-Origin"))
		}
	})

	t.Run("no origin is allowed", func(t *testing.T) {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", "/v1/api/x", nil))
		if w.Code != http.StatusOK {
			t.Errorf("code %d", w.Code)
		}
	})

	t.Run("preflight", func(t *testing.T) {
		r := httptest.NewRequest("OPTIONS", "/v1/api/x", nil)
		r.Header.Set("Origin", "https://app.example.com")
		r.Header.Set("Access-Control-Request-Method", "PUT")
		r.Header.Set("Access-Control-Request-Headers", "content-type")
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != http.StatusNoContent {
			t.Fatalf("code %d", w.Code)
		}
		if w.Header().Get("Access-Control-Allow-Methods") != corsMethods ||
			w.Header().Get("Access-Control-Allow-Headers") != "content-type" {
			t.Errorf("headers %v", w.Header())
		}
	})
}

func TestClientIP(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "10.0.0.1:5555" // Render edge
	if got := ClientIP(r, 1); got != "10.0.0.1" {
		t.Errorf("no XFF: got %s", got)
	}

	// A client-supplied fake entry is on the left; the edge appends the real one.
	r.Header.Set("X-Forwarded-For", "6.6.6.6, 203.0.113.7")
	if got := ClientIP(r, 1); got != "203.0.113.7" {
		t.Errorf("1 hop: got %s", got)
	}
	if got := ClientIP(r, 0); got != "10.0.0.1" {
		t.Errorf("0 hops: got %s", got)
	}
	if got := ClientIP(r, 9); got != "6.6.6.6" {
		t.Errorf("hops beyond chain: got %s", got)
	}
}

func TestRateLimiter(t *testing.T) {
	rl := NewRateLimiter(2, time.Minute, "slow down", 0)
	now := time.Now()

	for i := 1; i <= 2; i++ {
		if allowed, _, _ := rl.allow("a", now); !allowed {
			t.Fatalf("request %d rejected", i)
		}
	}
	if allowed, remaining, _ := rl.allow("a", now); allowed || remaining != 0 {
		t.Errorf("3rd request: allowed=%v remaining=%d", allowed, remaining)
	}
	if allowed, _, _ := rl.allow("b", now); !allowed {
		t.Error("other IP should have its own window")
	}
	if allowed, _, _ := rl.allow("a", now.Add(time.Minute)); !allowed {
		t.Error("window should reset")
	}
}

func TestRateLimiterMiddleware(t *testing.T) {
	h := NewRateLimiter(1, time.Minute, "slow down", 0).Middleware(ok)
	serve := func() *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
		return w
	}
	if w := serve(); w.Code != http.StatusOK {
		t.Fatalf("first: %d", w.Code)
	}
	w := serve()
	if w.Code != http.StatusTooManyRequests || w.Body.String() != "slow down" || w.Header().Get("Retry-After") == "" {
		t.Errorf("second: %d %q retry=%q", w.Code, w.Body.String(), w.Header().Get("Retry-After"))
	}
}
