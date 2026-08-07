#!/bin/bash
# Daemon launcher for Next.js dev server
PIDFILE=/home/z/my-project/.next-dev.pid
LOGFILE=/home/z/my-project/dev.log

# Kill any existing instance
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "next-server" 2>/dev/null
rm -f "$PIDFILE"
sleep 2

# Clean .next cache
rm -rf /home/z/my-project/.next

# Start the dev server fully detached
cd /home/z/my-project
setsid node node_modules/.bin/next dev -p 3000 >> "$LOGFILE" 2>&1 &
DISOWNED_PID=$!
echo "$DISOWNED_PID" > "$PIDFILE"
disown $DISOWNED_PID

# Wait for server to be ready
for i in $(seq 1 60); do
  if curl -s --connect-timeout 1 --max-time 3 http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo "READY: Server is running on port 3000 (PID: $DISOWNED_PID)"
    exit 0
  fi
  sleep 1
done
echo "FAIL: Server did not start within 60s"
exit 1
