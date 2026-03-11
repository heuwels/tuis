# Homeserver Deployment

See [power-monitor/deploy/README.md](../../power-monitor/deploy/README.md) for the full unified deployment pattern.

## Quick Reference

**Registry image:** `registry.home.lukeboyle.com/chore-calendar`
**Default port:** 6969

### Deploy

```bash
# After pushing to master branch:
cd ~/chore-calendar
docker compose pull
docker compose up -d
```

### Files on homeserver (`~/chore-calendar/`)

- `docker-compose.yml` - from `deploy/docker-compose.yml`
- `.env` - from `deploy/.env.example`
