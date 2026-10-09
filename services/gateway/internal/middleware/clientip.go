package middleware

import (
	"net"
	"net/http"
	"strings"
)

// ClientIP returns the caller's address, trusting `hops` reverse proxies in
// front of the gateway — the same rule as Express's `trust proxy <n>`.
//
// Render terminates TLS at its edge, so RemoteAddr is the edge proxy and the
// real client is the right-most X-Forwarded-For entry. A hop count rather
// than "trust everything" stops clients spoofing their IP via the header.
func ClientIP(r *http.Request, hops int) string {
	addrs := []string{remoteHost(r.RemoteAddr)}
	if xff := r.Header.Values("X-Forwarded-For"); len(xff) > 0 {
		parts := strings.Split(strings.Join(xff, ","), ",")
		for i := len(parts) - 1; i >= 0; i-- {
			if p := strings.TrimSpace(parts[i]); p != "" {
				addrs = append(addrs, p)
			}
		}
	}
	if hops >= len(addrs) {
		hops = len(addrs) - 1
	}
	return addrs[hops]
}

func remoteHost(addr string) string {
	if host, _, err := net.SplitHostPort(addr); err == nil {
		return host
	}
	return addr
}
