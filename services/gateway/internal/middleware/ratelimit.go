package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"
)

// RateLimiter is a fixed-window counter per client IP — the same algorithm as
// express-rate-limit's default memory store. State is per process, which is
// fine for a single gateway instance.
type RateLimiter struct {
	limit   int
	window  time.Duration
	message string
	hops    int

	mu      sync.Mutex
	clients map[string]*windowCount
}

type windowCount struct {
	count   int
	resetAt time.Time
}

func NewRateLimiter(limit int, window time.Duration, message string, trustProxyHops int) *RateLimiter {
	rl := &RateLimiter{
		limit:   limit,
		window:  window,
		message: message,
		hops:    trustProxyHops,
		clients: map[string]*windowCount{},
	}
	go rl.sweep()
	return rl
}

// allow counts one request and reports whether it is within the limit, along
// with what is left and when the window resets.
func (rl *RateLimiter) allow(key string, now time.Time) (ok bool, remaining int, resetAt time.Time) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	c, found := rl.clients[key]
	if !found || !now.Before(c.resetAt) {
		c = &windowCount{resetAt: now.Add(rl.window)}
		rl.clients[key] = c
	}
	c.count++
	return c.count <= rl.limit, max(rl.limit-c.count, 0), c.resetAt
}

// sweep drops expired windows so the map doesn't grow with every IP ever seen.
func (rl *RateLimiter) sweep() {
	for now := range time.Tick(rl.window) {
		rl.mu.Lock()
		for k, c := range rl.clients {
			if !now.Before(c.resetAt) {
				delete(rl.clients, k)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		now := time.Now()
		ok, remaining, resetAt := rl.allow(ClientIP(r, rl.hops), now)

		h := w.Header()
		h.Set("X-RateLimit-Limit", strconv.Itoa(rl.limit))
		h.Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
		h.Set("X-RateLimit-Reset", strconv.FormatInt(resetAt.Unix(), 10))

		if !ok {
			h.Set("Retry-After", strconv.Itoa(int(resetAt.Sub(now).Seconds()+0.999)))
			h.Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(rl.message))
			return
		}
		next.ServeHTTP(w, r)
	})
}
