---
description: Launch the skill-admin web UI to manage Claude Code skills and commands
allowed-tools: Bash
---

# Launch skill-admin

Start the skill-admin server (bundled with this plugin) in the background and
report the local URL. The server binds to 127.0.0.1 only.

Run this exact command:

```bash
PORT="${PORT:-7842}" node "${CLAUDE_PLUGIN_ROOT}/dist/server.js" >/tmp/skill-admin.log 2>&1 &
sleep 1; echo "skill-admin starting — open http://127.0.0.1:${PORT}"; cat /tmp/skill-admin.log
```

Then tell the user to open the printed URL in their browser. To stop it later,
they can run `pkill -f "${CLAUDE_PLUGIN_ROOT}/dist/server.js"` or kill the logged PID.
