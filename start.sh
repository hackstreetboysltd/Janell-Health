#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"

echo "Carelink KE"

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  else
    echo "Error: Missing .env and .env.example" >&2
    exit 1
  fi
fi

# Ensure AUTH_SECRET is long enough for Auth.js JWT encryption
if ! grep -qE '^AUTH_SECRET=.+' .env; then
  SECRET="$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)"
  echo "AUTH_SECRET=\"$SECRET\"" >> .env
  echo "Generated AUTH_SECRET in .env"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is required to run Postgres." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required. Install Node.js first." >&2
  exit 1
fi

stop_existing_app() {
  local pids=()
  local pid

  if command -v lsof >/dev/null 2>&1; then
    while read -r pid; do
      [[ "$pid" =~ ^[0-9]+$ ]] && pids+=("$pid")
    done < <(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  elif command -v ss >/dev/null 2>&1; then
    while read -r pid; do
      [[ "$pid" =~ ^[0-9]+$ ]] && pids+=("$pid")
    done < <(ss -ltnp "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u || true)
  fi

  # Next.js 16 lock is JSON: {"pid":123,"port":3000,...}
  if [[ -f .next/dev/lock ]]; then
    pid="$(node -e "try{const l=require('./.next/dev/lock'); if(l.pid) process.stdout.write(String(l.pid))}catch{}" 2>/dev/null || true)"
    if [[ "$pid" =~ ^[0-9]+$ ]]; then
      pids+=("$pid")
    fi
  fi

  if [[ ${#pids[@]} -eq 0 ]]; then
    rm -f .next/dev/lock 2>/dev/null || true
    return 0
  fi

  local unique=()
  while read -r pid; do
    [[ -n "$pid" ]] && unique+=("$pid")
  done < <(printf '%s\n' "${pids[@]}" | sort -u)

  echo "Stopping existing app on port $PORT (PID: ${unique[*]})..."
  for pid in "${unique[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  sleep 0.5
  for pid in "${unique[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
  rm -f .next/dev/lock 2>/dev/null || true
}

echo "Starting Postgres..."
docker compose up -d

echo "Waiting for Postgres..."
for i in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U carelink -d carelink >/dev/null 2>&1; then
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "Error: Postgres did not become ready in time." >&2
    exit 1
  fi
  sleep 1
done

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Applying database migrations..."
npx prisma generate >/dev/null
npx prisma migrate deploy

stop_existing_app

URL="http://localhost:${PORT}"
echo "Starting Carelink KE at ${URL}"

npm run dev -- --port "$PORT" &
APP_PID=$!

cleanup() {
  if kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Waiting for app to be ready..."
for i in $(seq 1 90); do
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    echo "Error: App process exited before becoming ready." >&2
    exit 1
  fi
  if curl -sf --max-time 1 "$URL" >/dev/null 2>&1; then
    break
  fi
  if [[ "$i" -eq 90 ]]; then
    echo "Error: App did not become ready in time." >&2
    exit 1
  fi
  sleep 0.5
done

open_browser() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$URL" >/dev/null 2>&1 || true
  elif command -v wslview >/dev/null 2>&1; then
    wslview "$URL" >/dev/null 2>&1 || true
  else
    echo "Open ${URL} in your browser."
    return 0
  fi
  echo "Opened ${URL} in your browser."
}

open_browser
wait "$APP_PID"
