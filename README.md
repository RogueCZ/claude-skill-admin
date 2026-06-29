# skill-admin

A local web UI for browsing, editing, creating, and deleting Claude Code skills and commands. It scans your `.claude` directories (global and per-project), lets you manage skill files with a Monaco editor, and keeps you safe with automatic backups and trash.

## Default Port

The server binds to **127.0.0.1:7842** by default. To use a different port, either:

- Set the `PORT` environment variable: `PORT=9000 npm start`
- Edit `skill-admin.config.json` in your home or project directory: `{ "port": 9000, "roots": [] }`

Environment variable takes precedence over the config file.

## Run Modes

### (a) Contributor / Development

```bash
npm install
npm run dev
```

Opens the Vite dev server with hot-reload at **http://127.0.0.1:7843** (proxies API calls to the Node server at 7842).

### (b) Direct (production build)

```bash
npm run build
npm start
```

Builds the Vite SPA and the esbuild server bundle into `dist/`, then starts the server at **http://127.0.0.1:7842**.

### (c) Claude Code Plugin

Install from the marketplace (replace `OWNER` with the actual GitHub owner):

```
/plugin marketplace add OWNER/skill-admin
/plugin install skill-admin@skill-admin
```

Then launch from any Claude Code session:

```
/skill-admin
```

This runs the pre-built `dist/server.js` bundled with the plugin and prints the URL to open.

## Configuration File

Place a `skill-admin.config.json` in your home directory (`~`) or the current project root. The file is optional — defaults are used if absent.

Schema:

```jsonc
{
  "port": 7842,        // port to listen on (overridden by PORT env var)
  "roots": [           // extra .claude root directories to scan
    "/path/to/extra-project"
  ]
}
```

Example with extra roots:

```json
{
  "port": 7842,
  "roots": [
    "/home/alice/team-skills",
    "/var/shared/.claude"
  ]
}
```

The global `~/.claude` and the current project's `.claude` directory are always scanned automatically. Paths in `roots` are deduplicated.

## Safety Notes

- **Backups:** Before any file is overwritten, the original is copied to `.skill-admin-backups/` in the same `.claude` root.
- **Trash:** Deleted files are moved to `.skill-admin-trash/` (not permanently deleted). You can recover them manually.
- **Localhost-only:** The server binds to `127.0.0.1`; it is never reachable from the network.
- **Plugin cache excluded:** The Claude Code plugin cache directory is automatically excluded from scans so you don't accidentally edit installed plugin files.

## Maintainer Notes

- The `dist/` directory is **committed** to this repository on purpose — it is the pre-built bundle shipped with the plugin so users can run `/skill-admin` without a build step.
- **Rebuild `dist/` before tagging a release:** run `npm run build` and commit the updated `dist/` so plugin installs pick up the latest code.
- GitHub URLs in `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` contain the placeholder `OWNER`. Replace it with the actual GitHub username or organisation before publishing.

## License

MIT
