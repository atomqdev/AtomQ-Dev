#!/bin/bash
# Robust dev server launcher that survives session disconnects
cd /home/z/my-project

# Kill any existing instances
pkill -f "next dev" 2>/dev/null
sleep 1

# Start dev server with nohup, fully detached
exec nohup bun run dev > /home/z/my-project/dev.log 2>&1
