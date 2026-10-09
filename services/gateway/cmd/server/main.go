// Command server is the public API gateway: the single origin for REST and
// Socket.IO. It owns CORS, rate limiting and security headers, and proxies to
// the backend services.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/klauspost/compress/gzhttp"

	"github.com/kmk-mobile/messaging-socket/services/gateway/internal/config"
	"github.com/kmk-mobile/messaging-socket/services/gateway/internal/health"
	mw "github.com/kmk-mobile/messaging-socket/services/gateway/internal/middleware"
	"github.com/kmk-mobile/messaging-socket/services/gateway/internal/proxy"
)

func main() {
	// Local dev convenience; real deployments set env directly.
	_ = godotenv.Load()
	cfg := config.Load()

	if cfg.InternalSecret == "" {
		log.Println("⚠️ INTERNAL_SECRET is not set — downstream services cannot distinguish gateway traffic from direct public traffic.")
	}

	handler, err := newHandler(cfg)
	if err != nil {
		log.Fatalf("❌ %v", err)
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
		// No WriteTimeout: it would cut off Socket.IO long-polling and
		// WebSockets. Per-upstream timeouts live on the proxies instead.
	}
	go func() {
		log.Printf("🚪 Gateway listening on port %s (env: %s)", cfg.Port, envName(cfg))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("❌ Server error: %v", err)
		}
	}()

	shutdown(srv)
}

func newHandler(cfg *config.Config) (http.Handler, error) {
	expense, err := proxy.New(cfg.ExpenseURL, proxy.Options{
		Name: "Expense service", Timeout: 10 * time.Second, InternalSecret: cfg.InternalSecret,
	})
	if err != nil {
		return nil, err
	}
	// Same timeout + error contract as expense: without it a cold or hung
	// monolith holds the connection open on the path that carries auth.
	monolith, err := proxy.New(cfg.MonolithURL, proxy.Options{
		Name: "Server", Timeout: 30 * time.Second, InternalSecret: cfg.InternalSecret,
	})
	if err != nil {
		return nil, err
	}
	// Socket.IO opens with HTTP polling before upgrading to a WebSocket; both
	// go through this one proxy, and both carry the internal secret (socket-go
	// 403s without it).
	socket, err := proxy.New(cfg.SocketURL, proxy.Options{
		Name: "Socket service", InternalSecret: cfg.InternalSecret, Streaming: true,
	})
	if err != nil {
		return nil, err
	}

	general := mw.NewRateLimiter(100, time.Minute,
		"Too many requests from this IP, please try again later.", cfg.TrustProxyHops)
	auth := mw.NewRateLimiter(50, 30*time.Minute,
		"Too many auth attempts, please try again later.", cfg.TrustProxyHops)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", health.Live)
	mux.HandleFunc("GET /health/ready", health.Ready([]health.Upstream{
		{Name: "monolith", URL: cfg.MonolithURL + "/v1/api/health"},
		{Name: "expense-service", URL: cfg.ExpenseURL + "/v1/api/health"},
		{Name: "socket-go", URL: cfg.SocketURL + "/health"},
	}))

	mux.Handle("/socket.io", socket)
	mux.Handle("/socket.io/", socket)

	mux.Handle("/v1/api/expenses", general.Middleware(expense))
	mux.Handle("/v1/api/expenses/", general.Middleware(expense))

	// Auth requests count against both limiters, as in the Node gateway.
	authLimited := general.Middleware(auth.Middleware(monolith))
	for _, p := range []string{"/v1/api/auth/login", "/v1/api/auth/register"} {
		mux.Handle(p, authLimited)
		mux.Handle(p+"/", authLimited)
	}

	// Everything else still lives on the monolith until its own extraction
	// phase cuts the relevant prefix over above this line.
	mux.Handle("/v1/api/", general.Middleware(monolith))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]any{"success": false, "error": "Not found"})
	})

	var h http.Handler = mux
	h = gzipExceptSocket(h)
	h = mw.CORS(cfg.AllowedOrigins)(h)
	h = mw.SecurityHeaders(h)
	h = mw.Logging(cfg.IsDevelopment(), cfg.TrustProxyHops)(h)
	return h, nil
}

// gzipExceptSocket compresses responses, but never Socket.IO: a gzip writer
// can't be hijacked for the WebSocket upgrade and buffers long-poll frames.
func gzipExceptSocket(next http.Handler) http.Handler {
	gz := gzhttp.GzipHandler(next)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/socket.io") {
			next.ServeHTTP(w, r)
			return
		}
		gz.ServeHTTP(w, r)
	})
}

// shutdown drains on SIGTERM/SIGINT with a 10s limit. Docker and Render send
// SIGTERM on stop/redeploy.
func shutdown(srv *http.Server) {
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGTERM, syscall.SIGINT)
	log.Printf("🛑 gateway: %s received, draining…", <-sig)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("⚠️ gateway: drain timed out: %v", err)
		os.Exit(1)
	}
	log.Println("👋 gateway: shutdown complete")
}

func envName(cfg *config.Config) string {
	if cfg.Env == "" {
		return "development"
	}
	return cfg.Env
}
