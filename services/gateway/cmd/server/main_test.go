package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/kmk-mobile/messaging-socket/services/gateway/internal/config"
)

// recorder is a fake upstream that remembers which paths reached it.
type recorder struct {
	mu    sync.Mutex
	paths []string
	srv   *httptest.Server
}

func newRecorder() *recorder {
	r := &recorder{}
	r.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		r.mu.Lock()
		r.paths = append(r.paths, req.URL.Path)
		r.mu.Unlock()
		_, _ = io.WriteString(w, "ok")
	}))
	return r
}

func (r *recorder) count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.paths)
}

func TestRouting(t *testing.T) {
	monolith, expense, socket := newRecorder(), newRecorder(), newRecorder()
	defer monolith.srv.Close()
	defer expense.srv.Close()
	defer socket.srv.Close()

	h, err := newHandler(&config.Config{
		MonolithURL: monolith.srv.URL, ExpenseURL: expense.srv.URL, SocketURL: socket.srv.URL,
	})
	if err != nil {
		t.Fatal(err)
	}
	get := func(path string) int {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		return w.Code
	}

	cases := []struct {
		path string
		want *recorder
	}{
		{"/v1/api/expenses", expense},
		{"/v1/api/expenses/budgets/1", expense},
		{"/v1/api/expensesX", monolith}, // prefix match is per path segment
		{"/v1/api/users/friends", monolith},
		{"/v1/api/auth/login", monolith},
		{"/socket.io/?EIO=4&transport=polling", socket},
	}
	for _, c := range cases {
		before := c.want.count()
		if code := get(c.path); code != http.StatusOK {
			t.Errorf("%s: status %d", c.path, code)
		}
		if c.want.count() != before+1 {
			t.Errorf("%s: did not reach the expected upstream", c.path)
		}
	}

	if code := get("/health"); code != http.StatusOK {
		t.Errorf("/health: %d", code)
	}
	if code := get("/nope"); code != http.StatusNotFound {
		t.Errorf("/nope: %d", code)
	}
}

func TestRateLimitScopes(t *testing.T) {
	up := newRecorder()
	defer up.srv.Close()
	h, _ := newHandler(&config.Config{MonolithURL: up.srv.URL, ExpenseURL: up.srv.URL, SocketURL: up.srv.URL})
	get := func(path string) int {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		return w.Code
	}

	// Socket.IO is never rate limited.
	for range 150 {
		if code := get("/socket.io/?EIO=4"); code != http.StatusOK {
			t.Fatalf("socket.io limited: %d", code)
		}
	}
	// 50 auth requests hit the auth limit and also use 50 of the general 100.
	for i := range 50 {
		if code := get("/v1/api/auth/login"); code != http.StatusOK {
			t.Fatalf("auth request %d: %d", i+1, code)
		}
	}
	if code := get("/v1/api/auth/login"); code != http.StatusTooManyRequests {
		t.Errorf("51st auth request: %d", code)
	}
	// That rejected request still counted against the general window (51 used).
	for i := range 49 {
		if code := get("/v1/api/users"); code != http.StatusOK {
			t.Fatalf("general request %d: %d", i+1, code)
		}
	}
	if code := get("/v1/api/users"); code != http.StatusTooManyRequests {
		t.Errorf("101st /v1/api request: %d", code)
	}
}
