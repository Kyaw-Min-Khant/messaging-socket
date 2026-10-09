package middleware

import (
	"bufio"
	"errors"
	"log"
	"net"
	"net/http"
	"time"
)

// Logging writes one access-log line per request, in the spirit of morgan's
// "dev" (development) and "combined" (everything else) formats.
func Logging(dev bool, trustProxyHops int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w}
			next.ServeHTTP(rec, r)

			status := rec.status
			if status == 0 {
				status = http.StatusOK
			}
			if dev {
				log.Printf("%s %s %d %s - %d B", r.Method, r.URL.RequestURI(), status, time.Since(start).Round(time.Millisecond), rec.bytes)
				return
			}
			log.Printf("%s - - \"%s %s %s\" %d %d \"%s\" \"%s\" %s",
				ClientIP(r, trustProxyHops), r.Method, r.URL.RequestURI(), r.Proto, status, rec.bytes,
				r.Referer(), r.UserAgent(), time.Since(start).Round(time.Millisecond))
		})
	}
}

// statusRecorder captures the status code and body size. It must pass through
// Hijack and Flush: WebSocket upgrades hijack the connection, and Socket.IO
// long-polling relies on flushing — wrapping without them breaks real-time.
type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (s *statusRecorder) WriteHeader(code int) {
	if s.status == 0 {
		s.status = code
	}
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusRecorder) Write(b []byte) (int, error) {
	if s.status == 0 {
		s.status = http.StatusOK
	}
	n, err := s.ResponseWriter.Write(b)
	s.bytes += n
	return n, err
}

func (s *statusRecorder) Flush() {
	if f, ok := s.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (s *statusRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := s.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, errors.New("underlying ResponseWriter does not support hijacking")
	}
	if s.status == 0 {
		s.status = http.StatusSwitchingProtocols
	}
	return h.Hijack()
}

func (s *statusRecorder) Unwrap() http.ResponseWriter { return s.ResponseWriter }
