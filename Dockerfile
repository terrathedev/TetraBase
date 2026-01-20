# Stage 1: Build
FROM oven/bun:alpine AS builder
WORKDIR /app

# The asterisk (*) handles both bun.lockb and bun.lock
COPY package.json bun.lock* ./
RUN bun install

COPY . .

# Build the binary targeting musl (Alpine)
RUN bun build ./app.js --compile --target=bun-linux-x64-musl --outfile tetrabase-alpine

# Stage 2: Run
FROM alpine:latest
WORKDIR /app

# libstdc++ is required for Bun binaries; gcompat helps with edge cases
RUN apk add --no-cache libstdc++ gcompat

# Copy the binary from the builder stage
COPY --from=builder /app/tetrabase-alpine /app/tetrabase
RUN chmod +x /app/tetrabase

# Expose the internal port
EXPOSE 3005

# Use the absolute path for the command
CMD ["/app/tetrabase"]
