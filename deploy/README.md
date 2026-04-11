# Deployment

## Quick Reference

**Default port:** 6969

### Deploy

```bash
# Set REGISTRY in .env to your container registry
docker compose pull
docker compose up -d
```

### Files

- `docker-compose.yml` - compose config
- `.env` - from `.env.example` (create with your values)
