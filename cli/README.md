# tuis-cli

Command-line interface for the [Tuis](https://github.com/heuwels/tuis) household management app.

## Setup

```bash
cd cli
npm install
npm run build
```

To make the `tuis` command available globally:

```bash
npm link
```

## Configuration

Before using the CLI, configure your server URL and access token:

```bash
tuis configure
```

You'll be prompted for:
- **Server URL** — e.g. `http://localhost:3000` or `https://chores.home.example.com`
- **Access token** — create one in Settings > Personal Access Tokens

Config is stored in `~/.config/tuis/config.json` with restricted permissions.

## Usage

```bash
tuis <resource> <command> [options]
```

### Resources

| Resource | Commands |
|----------|----------|
| `tasks` | `list`, `get`, `create`, `update`, `delete`, `complete` |
| `shopping lists` | `list`, `create`, `delete` |
| `shopping items` | `add`, `update`, `delete` |
| `recipes` | `list`, `get`, `create`, `update`, `delete` |
| `meals` | `list`, `get`, `set`, `delete` |
| `vehicles` | `list`, `get`, `create`, `update`, `delete` |
| `vehicles fuel` | `list`, `add` |
| `vehicles services` | `list`, `add` |
| `vendors` | `list`, `get`, `create`, `update`, `delete` |
| `quotes` | `list`, `get`, `create`, `update`, `delete` |
| `appliances` | `list`, `get`, `create`, `update`, `delete` |
| `activities` | `list`, `get`, `create`, `update`, `delete` |
| `users` | `list`, `create`, `delete` |
| `stats` | _(shows household stats)_ |

### Examples

```bash
# List all tasks
tuis tasks list

# Create a task
tuis tasks create --name "Clean gutters" --area Outdoor --frequency Quarterly

# Mark a task complete
tuis tasks complete 5

# Add a shopping item
tuis shopping items add --list 1 --name "Milk" --quantity "2L"

# List vehicles as JSON
tuis vehicles list --json

# Log fuel
tuis vehicles fuel add 1 --date 2026-04-19 --odometer 45000 --litres 42.5 --cost 89.50

# View stats
tuis stats
```

### Output formats

List commands default to a table view. Use `--json` for JSON output:

```bash
tuis tasks list          # table
tuis tasks list --json   # JSON
tuis tasks get 5         # always JSON (single item)
```

## Authentication

The CLI uses Personal Access Tokens (PATs) for authentication. Tokens are created in the Tuis web UI under Settings > Personal Access Tokens.

Each token has scopes that control which endpoints it can access (e.g. `tasks:read`, `tasks:write`). The CLI sends the token as a `Bearer` header with every request.
