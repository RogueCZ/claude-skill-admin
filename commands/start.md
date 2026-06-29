---
description: Start the skill-admin web UI server in the background
allowed-tools: Bash
---

# Start skill-admin

Start the skill-admin server (bundled with this plugin) in the background and
report the local URL. The server binds to 127.0.0.1 only. Override the port by
setting `PORT` (default 7842).

Run this exact command:

```bash
PORT="${PORT:-7842}"
if [ -f /tmp/skill-admin.pid ] && kill -0 "$(cat /tmp/skill-admin.pid)" 2>/dev/null; then
  echo "skill-admin already running (PID $(cat /tmp/skill-admin.pid)) — open http://127.0.0.1:${PORT}"
else
  PORT="$PORT" node "${CLAUDE_PLUGIN_ROOT}/dist/server.js" >/tmp/skill-admin.log 2>&1 &
  echo $! > /tmp/skill-admin.pid
  sleep 1
  echo "skill-admin started (PID $(cat /tmp/skill-admin.pid)) — open http://127.0.0.1:${PORT}"
  cat /tmp/skill-admin.log
fi
```

Then tell the user to open the printed URL in their browser. Stop it later with
`/skill-admin:stop`.
