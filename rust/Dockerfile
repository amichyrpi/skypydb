FROM rust:1.85-bookworm AS builder

WORKDIR /app
COPY . .
RUN cargo build --release -p skypydb

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY --from=builder /app/target/release/skypydb /usr/local/bin/skypydb

EXPOSE 8000
ENV SKYPYDB_SERVER_PORT=8000

CMD ["skypydb"]
