// Command server is the Socket.IO service for real-time messaging. It replaces
// the socket part of the Node monolith; the REST API stays in Node.
package main

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	sio "github.com/zishang520/socket.io/servers/socket/v3"
	"github.com/zishang520/socket.io/v3/pkg/types"

	"github.com/kmk-mobile/messaging-socket/services/socket-go/internal/config"
	"github.com/kmk-mobile/messaging-socket/services/socket-go/internal/presence"
	"github.com/kmk-mobile/messaging-socket/services/socket-go/internal/push"
	"github.com/kmk-mobile/messaging-socket/services/socket-go/internal/socket"
	"github.com/kmk-mobile/messaging-socket/services/socket-go/internal/store"
)

const internalSecretHeader = "X-Internal-Secret"

func main() {
	// Local dev convenience; real deployments set env directly.
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("❌ %v", err)
	}

	startCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	st, err := store.Connect(startCtx, cfg.MongoURI)
	if err != nil {
		log.Fatalf("❌ Error connecting to MongoDB: %v", err)
	}
	log.Println("✅ MongoDB connected")

	pr := presence.New(cfg.RedisHost, cfg.RedisPort, cfg.RedisPassword)
	if err := pr.Ping(startCtx); err != nil {
		log.Fatalf("❌ Error connecting to Redis: %v", err)
	}
	log.Println("✅ Redis connected")

	var pusher push.Sender = push.Noop{}
	if cfg.Firebase.Enabled() {
		fcm, err := push.NewFCM(startCtx, cfg.Firebase)
		if err != nil {
			log.Fatalf("❌ Error initializing Firebase: %v", err)
		}
		pusher = fcm
		log.Println("✅ Firebase initialized")
	} else {
		log.Println("⚠️ Firebase env not set — offline push notifications are disabled")
	}

	opts := sio.DefaultServerOptions()
	opts.SetServeClient(false)
	opts.SetCors(&types.Cors{
		Origin:      cfg.AllowedOrigins,
		Methods:     []string{"GET", "POST"},
		Credentials: true,
	})
	if cfg.InternalSecret != "" {
		// Only the gateway may open sockets; it stamps this header on both
		// polling requests and the WebSocket upgrade.
		opts.SetAllowRequest(func(ctx *types.HttpContext) error {
			got := ctx.Headers().Peek(internalSecretHeader)
			if subtle.ConstantTimeCompare([]byte(got), []byte(cfg.InternalSecret)) != 1 {
				return errors.New("forbidden")
			}
			return nil
		})
	} else {
		log.Println("⚠️ INTERNAL_SECRET is not set — this service accepts direct public traffic. Set it in every environment but local.")
	}

	io := sio.NewServer(nil, nil)
	socket.Register(io, st, pr, pusher, cfg.JWTSecret)

	mux := http.NewServeMux()
	mux.Handle("/socket.io/", io.ServeHandler(opts))
	mux.HandleFunc("GET /health", healthHandler(st, pr))

	srv := &http.Server{Addr: ":" + cfg.Port, Handler: mux}
	go func() {
		log.Printf("🚀 Socket service running on port %s (env: %s)", cfg.Port, envName(cfg))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("❌ Server error: %v", err)
		}
	}()

	shutdown(srv, io, st, pr)
}

// shutdown drains on SIGTERM/SIGINT with a 10s limit, like registerShutdown in
// the Node monolith.
func shutdown(srv *http.Server, io *sio.Server, st *store.Store, pr *presence.Presence) {
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGTERM, syscall.SIGINT)
	log.Printf("🛑 %s received, draining…", <-sig)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	io.Close(nil)
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("⚠️ HTTP shutdown: %v", err)
	}
	if err := st.Close(ctx); err != nil {
		log.Printf("⚠️ Mongo close: %v", err)
	}
	if err := pr.Close(); err != nil {
		log.Printf("⚠️ Redis close: %v", err)
	}
	log.Println("👋 Shutdown complete")
}

func healthHandler(st *store.Store, pr *presence.Presence) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		mongoOK := st.Ping(ctx) == nil
		redisOK := pr.Ping(ctx) == nil

		status := http.StatusOK
		if !mongoOK || !redisOK {
			status = http.StatusServiceUnavailable
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": status == http.StatusOK,
			"service": "socket-go",
			"mongo":   mongoOK,
			"redis":   redisOK,
		})
	}
}

func envName(cfg *config.Config) string {
	if cfg.Env == "" {
		return "development"
	}
	return cfg.Env
}
