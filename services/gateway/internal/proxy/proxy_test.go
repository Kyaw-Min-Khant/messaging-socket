package proxy

import (
	"bufio"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/kmk-mobile/messaging-socket/services/gateway/internal/middleware"
)

func TestProxyHeaders(t *testing.T) {
	var got http.Header
	var gotHost string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got, gotHost = r.Header.Clone(), r.Host
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Security-Policy", "default-src 'none'")
		w.Header().Set("X-Powered-By", "Express")
		_, _ = io.WriteString(w, "ok")
	}))
	defer upstream.Close()

	p, err := New(upstream.URL, Options{Name: "Test", InternalSecret: "s3cret"})
	if err != nil {
		t.Fatal(err)
	}
	// Run behind the same middleware main uses, so header merging is realistic.
	h := middleware.SecurityHeaders(middleware.CORS([]string{"https://app.example.com"})(p))

	r := httptest.NewRequest("GET", "http://gateway.example.com/v1/api/x", nil)
	r.RemoteAddr = "10.0.0.1:1234"
	r.Header.Set("Origin", "https://app.example.com")
	r.Header.Set("X-Forwarded-For", "203.0.113.7")
	r.Header.Set("X-Forwarded-Proto", "https")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)

	if got.Get(InternalSecretHeader) != "s3cret" {
		t.Error("internal secret not forwarded")
	}
	if xff := got.Get("X-Forwarded-For"); xff != "203.0.113.7,10.0.0.1" {
		t.Errorf("X-Forwarded-For = %q", xff)
	}
	if proto := got.Get("X-Forwarded-Proto"); proto != "https,http" {
		t.Errorf("X-Forwarded-Proto = %q", proto)
	}
	if host := got.Get("X-Forwarded-Host"); host != "gateway.example.com" {
		t.Errorf("X-Forwarded-Host = %q", host)
	}
	if !strings.HasPrefix(upstream.URL, "http://"+gotHost) {
		t.Errorf("Host = %q, want upstream host (changeOrigin)", gotHost)
	}

	res := w.Result()
	if v := res.Header.Values("Access-Control-Allow-Origin"); len(v) != 1 || v[0] != "https://app.example.com" {
		t.Errorf("Allow-Origin = %v, want exactly the gateway's", v)
	}
	if v := res.Header.Values("Content-Security-Policy"); len(v) != 1 || v[0] != "default-src 'none'" {
		t.Errorf("CSP = %v, want the upstream's only", v)
	}
	if res.Header.Get("X-Frame-Options") != "SAMEORIGIN" {
		t.Error("missing default security header the upstream didn't send")
	}
	if res.Header.Get("X-Powered-By") != "" {
		t.Error("X-Powered-By should be stripped")
	}
}

func TestProxyUpstreamDown(t *testing.T) {
	ln, _ := net.Listen("tcp", "127.0.0.1:0")
	addr := ln.Addr().String()
	ln.Close() // nothing listening

	p, _ := New("http://"+addr, Options{Name: "Expense service", Timeout: time.Second})
	w := httptest.NewRecorder()
	p.ServeHTTP(w, httptest.NewRequest("GET", "/v1/api/expenses", nil))

	var body map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if w.Code != http.StatusServiceUnavailable || body["error"] != "Expense service is starting up. Please try again in a moment." {
		t.Errorf("got %d %v", w.Code, body)
	}
}

func TestProxyWebSocketUpgrade(t *testing.T) {
	var secret string
	// Minimal upgrade-and-echo server: enough to prove the gateway passes the
	// 101 handshake through and then pipes raw bytes both ways.
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		secret = r.Header.Get(InternalSecretHeader)
		if r.Header.Get("Upgrade") != "websocket" {
			http.Error(w, "expected upgrade", http.StatusBadRequest)
			return
		}
		conn, rw, err := w.(http.Hijacker).Hijack()
		if err != nil {
			return
		}
		defer conn.Close()
		_, _ = rw.WriteString("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n")
		_ = rw.Flush()
		line, _ := rw.ReadString('\n')
		_, _ = rw.WriteString("echo:" + line)
		_ = rw.Flush()
	}))
	defer upstream.Close()

	p, _ := New(upstream.URL, Options{Name: "Socket service", InternalSecret: "s3cret", Streaming: true})
	gateway := httptest.NewServer(middleware.Logging(true, 0)(p)) // logging wrapper must allow Hijack
	defer gateway.Close()

	conn, err := net.Dial("tcp", strings.TrimPrefix(gateway.URL, "http://"))
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(5 * time.Second))

	_, _ = io.WriteString(conn, "GET /socket.io/?EIO=4&transport=websocket HTTP/1.1\r\nHost: gw\r\n"+
		"Connection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n")
	br := bufio.NewReader(conn)
	res, err := http.ReadResponse(br, nil)
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusSwitchingProtocols {
		t.Fatalf("status %d", res.StatusCode)
	}
	if secret != "s3cret" {
		t.Error("internal secret missing on upgrade request")
	}

	_, _ = io.WriteString(conn, "hello\n")
	line, err := br.ReadString('\n')
	if err != nil || line != "echo:hello\n" {
		t.Errorf("echo = %q, %v", line, err)
	}
}
