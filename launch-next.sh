#!/bin/bash
# Daemon launcher for Next.js dev server
# Uses setsid + disown to fully detach from parent shell's process group,
# making the process immune to SIGHUP on shell exit.

PIDFILE=/home/z/my-project/.next-dev.pid
LOGFILE=/home/z/my-project/dev.log
ENVFILE=/home/z/my-project/.env

# Kill any existing instance
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "next-server" 2>/dev/null
rm -f "$PIDFILE"
sleep 2

# Clean .next cache
rm -rf /home/z/my-project/.next

# Source .env file and export all variables so they override system env
if [ -f "$ENVFILE" ]; then
  set -a  # auto-export all variables
  while IFS='=' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    # Remove any surrounding quotes from value
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    export "$key=$value"
  done < "$ENVFILE"
  set +a
fi

# Verify critical env vars are set
echo "=== Environment Verification ===" > "$LOGFILE"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..." >> "$LOGFILE"
echo "NEXTAUTH_URL: $NEXTAUTH_URL" >> "$LOGFILE"
echo "NODE_ENV: $NODE_ENV" >> "$LOGFILE"
echo "NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:0:10}..." >> "$LOGFILE"
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:15}..." >> "$LOGFILE"
echo "================================" >> "$LOGFILE"

# Start the dev server fully detached via setsid + disown
cd /home/z/my-project
setsid env -i \
  DATABASE_URL="$DATABASE_URL" \
  NEXTAUTH_URL="$NEXTAUTH_URL" \
  NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  NODE_ENV="$NODE_ENV" \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  PATH="$PATH" \
  HOME="$HOME" \
  bun run dev >> "$LOGFILE" 2>&1 &
DISOWNED_PID=$!
echo "$DISOWNED_PID" > "$PIDFILE"
disown $DISOWNED_PID

echo "Launched Next.js dev server (PID: $DISOWNED_PID) with setsid + disown"

# Wait for server to be ready
for i in $(seq 1 90); do
  if curl -s --connect-timeout 1 --max-time 3 http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo "READY: Server is running on port 3000 (PID: $DISOWNED_PID)"
    exit 0
  fi
  sleep 1
done
echo "FAIL: Server did not start within 90s"
exit 1
