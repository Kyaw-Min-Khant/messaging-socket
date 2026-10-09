// Package health serves the gateway's liveness and readiness endpoints.
package health

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

type Upstream struct {
	Name string
	URL  string // full URL of the upstream's health endpoint
}

// Live reports that this process is up. Deliberately shallow so a downstream
// outage never makes Render restart a healthy gateway.
func Live(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"success":   true,
		"message":   "Gateway is running",
		"timestamp": time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
	})
}

type probeResult struct {
	Name   string `json:"name"`
	OK     bool   `json:"ok"`
	Status int    `json:"status,omitempty"`
	Error  string `json:"error,omitempty"`
}

// Ready reports whether the gateway can serve traffic, probing every upstream.
func Ready(upstreams []Upstream) http.HandlerFunc {
	client := &http.Client{Timeout: 3 * time.Second}
	return func(w http.ResponseWriter, r *http.Request) {
		results := make([]probeResult, len(upstreams))
		var wg sync.WaitGroup
		for i, u := range upstreams {
			wg.Go(func() { results[i] = probe(r.Context(), client, u) })
		}
		wg.Wait()

		ready := true
		for _, res := range results {
			ready = ready && res.OK
		}
		status := http.StatusOK
		if !ready {
			status = http.StatusServiceUnavailable
		}
		writeJSON(w, status, map[string]any{"success": ready, "upstreams": results})
	}
}

func probe(ctx context.Context, client *http.Client, u Upstream) probeResult {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.URL, nil)
	if err != nil {
		return probeResult{Name: u.Name, Error: err.Error()}
	}
	res, err := client.Do(req)
	if err != nil {
		return probeResult{Name: u.Name, Error: err.Error()}
	}
	res.Body.Close()
	ok := res.StatusCode >= 200 && res.StatusCode < 300
	return probeResult{Name: u.Name, OK: ok, Status: res.StatusCode}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
