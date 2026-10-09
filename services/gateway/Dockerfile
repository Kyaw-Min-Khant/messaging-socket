FROM golang:1.26-alpine AS build
WORKDIR /src

COPY services/gateway/go.mod services/gateway/go.sum ./
RUN go mod download

COPY services/gateway/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/gateway ./cmd/server

FROM alpine:3.21
# CA certs in case an upstream URL is https
RUN apk add --no-cache ca-certificates && adduser -D -H app
USER app
COPY --from=build /out/gateway /usr/local/bin/gateway

EXPOSE 4000
CMD ["gateway"]
