package middleware

import (
	"log"
	"net/http"
	"slices"
)

const corsMethods = "GET,HEAD,PUT,PATCH,POST,DELETE"

// CORS is centralized in the gateway — the only publicly reachable service —
// and mirrors the `cors` package with credentials and an origin allowlist.
//
// A request with no Origin header (same-origin browser, Swagger on the API
// host, Postman, mobile apps) is allowed. A disallowed origin gets no CORS
// headers but still goes through, so the browser — not the gateway — blocks
// the response, exactly like `callback(null, false)` in the Node gateway.
func CORS(allowed []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			h := w.Header()
			h.Add("Vary", "Origin")

			ok := origin == "" || slices.Contains(allowed, origin)
			if !ok {
				log.Printf("CORS blocked origin: %s", origin)
			} else if origin != "" {
				h.Set("Access-Control-Allow-Origin", origin)
				h.Set("Access-Control-Allow-Credentials", "true")
			}

			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				if ok {
					h.Set("Access-Control-Allow-Methods", corsMethods)
					if reqHeaders := r.Header.Get("Access-Control-Request-Headers"); reqHeaders != "" {
						h.Set("Access-Control-Allow-Headers", reqHeaders)
						h.Add("Vary", "Access-Control-Request-Headers")
					}
				}
				h.Set("Content-Length", "0")
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
