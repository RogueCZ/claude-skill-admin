---
description: Stop the running skill-admin web UI server
allowed-tools: Bash
---

# Stop skill-admin

Stop the background skill-admin server started by `/skill-admin:start`.

Run this exact command:

```bash
if [ -f /tmp/skill-admin.pid ]; then
  PID=$(cat /tmp/skill-admin.pid)
  if kill "$PID" 2>/dev/null; then
    echo "skill-admin stopped (PID $PID)"
  else
    echo "skill-admin (PID $PID) was not running"
  fi
  rm -f /tmp/skill-admin.pid
elif pkill -f "${CLAUDE_PLUGIN_ROOT}/dist/server.js" 2>/dev/null; then
  echo "skill-admin stopped"
else
  echo "skill-admin is not running"
fi
```
