// Package presence keeps the Redis "connectedUsers" hash that the Node
// service maintained (src/socket/index.ts).
package presence

import (
	"context"
	"encoding/json"
	"net"
	"time"

	"github.com/redis/go-redis/v9"
)

const connectedUsersKey = "connectedUsers"

type Entry struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	UserID   string `json:"userId"`
	SocketID string `json:"socketId"`
	IsOnline bool   `json:"isOnline"`
	LastSeen string `json:"lastSeen"`
}

type Presence struct {
	rdb *redis.Client
}

// New mirrors src/config/redis.ts: host and port are separate, and a password
// means the "default" ACL user.
func New(host, port, password string) *Presence {
	opts := &redis.Options{Addr: net.JoinHostPort(host, port)}
	if password != "" {
		opts.Username = "default"
		opts.Password = password
	}
	return &Presence{rdb: redis.NewClient(opts)}
}

func (p *Presence) Ping(ctx context.Context) error { return p.rdb.Ping(ctx).Err() }

func (p *Presence) Close() error { return p.rdb.Close() }

func (p *Presence) Add(ctx context.Context, socketID, userID, username string) error {
	entry, err := json.Marshal(Entry{
		ID:       socketID,
		Username: username,
		UserID:   userID,
		SocketID: socketID,
		IsOnline: true,
		LastSeen: ISOTime(time.Now()),
	})
	if err != nil {
		return err
	}
	return p.rdb.HSet(ctx, connectedUsersKey, socketID, entry).Err()
}

func (p *Presence) Remove(ctx context.Context, socketID string) error {
	return p.rdb.HDel(ctx, connectedUsersKey, socketID).Err()
}

// ISOTime formats like JavaScript's Date.prototype.toISOString.
func ISOTime(t time.Time) string {
	return t.UTC().Format("2006-01-02T15:04:05.000Z")
}
