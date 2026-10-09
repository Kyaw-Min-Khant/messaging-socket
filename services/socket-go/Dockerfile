FROM golang:1.26-alpine AS build
WORKDIR /src

COPY services/socket-go/go.mod services/socket-go/go.sum ./
RUN go mod download

COPY services/socket-go/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/socket-go ./cmd/server

FROM alpine:3.21
# CA certs for Atlas, Redis Cloud and FCM over TLS
RUN apk add --no-cache ca-certificates && adduser -D -H app
USER app
COPY --from=build /out/socket-go /usr/local/bin/socket-go

EXPOSE 1600
CMD ["socket-go"]
