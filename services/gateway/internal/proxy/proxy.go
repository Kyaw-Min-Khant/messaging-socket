// Package proxy is the gateway's routing targets. /v1/api/expenses goes to
// expense-service and /socket.io to socket-go; everything else still proxies
// to the original monolith, per the phased rollout. auth/user/messaging
// services get their own entry here once each is extracted — this is the one
// place that changes to cut traffic over (or roll it back).
package proxy

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/kmk-mobile/messaging-socket/services/gateway/internal/middleware"
)

// InternalSecretHeader lets downstream services tell "came through the
// gateway" from "came straight off the internet" — they are `type: web` on
// Render and so have public URLs. It authenticates the caller, not the user;
// JWT verification still happens downstream.
const InternalSecretHeader = "X-Internal-Secret"

type Options struct {
	// Name appears in the 503 body: "<Name> is starting up…".
	Name string
	// Timeout bounds the wait for upstream response headers. Zero means none,
	// which the socket proxy needs for long-polling and WebSockets.
	Timeout        time.Duration
	InternalSecret string
	// Streaming flushes every write immediately (Socket.IO polling).
	Streaming bool
}

// New returns a reverse proxy to target. WebSocket upgrades are handled by
// httputil.ReverseProxy itself, through the same handler as plain HTTP.
func New(target string, opts Options) (http.Handler, error) {
	u, err := url.Parse(target)
	if err != nil {
		return nil, err
	}

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.ResponseHeaderTimeout = opts.Timeout

	rp := &httputil.ReverseProxy{
		Transport: transport,
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(u) // also rewrites Host to the target (changeOrigin)
			appendForwarded(pr)
			if opts.InternalSecret != "" {
				pr.Out.Header.Set(InternalSecretHeader, opts.InternalSecret)
			}
		},
		ModifyResponse: func(res *http.Response) error {
			// The gateway owns CORS. socket-go sets its own Access-Control-*
			// headers, and ReverseProxy adds upstream headers to ours — two
			// Allow-Origin values make the browser reject the response.
			for k := range res.Header {
				if strings.HasPrefix(k, "Access-Control-") {
					res.Header.Del(k)
				}
			}
			middleware.FillSecurityHeaders(res.Header)
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			if errors.Is(err, context.Canceled) {
				return // client went away; nobody to answer
			}
			log.Printf("⚠️ %s proxy error for %s %s: %v", opts.Name, r.Method, r.URL.Path, err)
			middleware.FillSecurityHeaders(w.Header())
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": false,
				"error":   opts.Name + " is starting up. Please try again in a moment.",
			})
		},
	}
	if opts.Streaming {
		rp.FlushInterval = -1
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		middleware.ClearSecurityHeaders(w.Header())
		rp.ServeHTTP(w, r)
	}), nil
}

// appendForwarded mirrors http-proxy's `xfwd: true`: append to any incoming
// X-Forwarded-For/-Proto (so the chain from Render's edge survives) and keep
// the original X-Forwarded-Host. Rewrite strips these from Out before calling
// us, so we rebuild them from In.
func appendForwarded(pr *httputil.ProxyRequest) {
	in, out := pr.In, pr.Out

	clientIP, _, err := net.SplitHostPort(in.RemoteAddr)
	if err != nil {
		clientIP = in.RemoteAddr
	}
	proto := "http"
	if in.TLS != nil {
		proto = "https"
	}

	appendHeader := func(name, value string) {
		if prior := strings.Join(in.Header.Values(name), ", "); prior != "" {
			value = prior + "," + value
		}
		out.Header.Set(name, value)
	}
	appendHeader("X-Forwarded-For", clientIP)
	appendHeader("X-Forwarded-Proto", proto)

	host := in.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = in.Host
	}
	out.Header.Set("X-Forwarded-Host", host)
}
