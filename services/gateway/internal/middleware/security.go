package middleware

import "net/http"

// securityHeaders are helmet v7's defaults, which the Node gateway applied to
// every response.
var securityHeaders = map[string]string{
	"Content-Security-Policy": "default-src 'self';base-uri 'self';font-src 'self' https: data:;" +
		"form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';" +
		"script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';" +
		"upgrade-insecure-requests",
	"Cross-Origin-Opener-Policy":        "same-origin",
	"Cross-Origin-Resource-Policy":      "same-origin",
	"Origin-Agent-Cluster":              "?1",
	"Referrer-Policy":                   "no-referrer",
	"Strict-Transport-Security":         "max-age=31536000; includeSubDomains",
	"X-Content-Type-Options":            "nosniff",
	"X-Dns-Prefetch-Control":            "off",
	"X-Download-Options":                "noopen",
	"X-Frame-Options":                   "SAMEORIGIN",
	"X-Permitted-Cross-Domain-Policies": "none",
	"X-Xss-Protection":                  "0",
}

// SecurityHeaders sets helmet's defaults on every response.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		for k, v := range securityHeaders {
			w.Header().Set(k, v)
		}
		next.ServeHTTP(w, r)
	})
}

// ClearSecurityHeaders removes the gateway's defaults before a proxied
// response is copied in. The backends run helmet too, and ReverseProxy *adds*
// upstream headers rather than replacing them — without this, responses would
// carry two CSPs. In the Node gateway the upstream's value won; this keeps that.
func ClearSecurityHeaders(h http.Header) {
	for k := range securityHeaders {
		h.Del(k)
	}
}

// FillSecurityHeaders sets any default the upstream response didn't send
// (socket-go doesn't use helmet).
func FillSecurityHeaders(h http.Header) {
	for k, v := range securityHeaders {
		if h.Get(k) == "" {
			h.Set(k, v)
		}
	}
	h.Del("X-Powered-By")
}
