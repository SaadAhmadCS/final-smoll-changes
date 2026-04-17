# Smoll Infrastructure: Deployment & Routing Overview

## Big Picture

```
Browser → Cloudflare DNS → DigitalOcean Droplet → Nginx → Docker Container
```

There are **two environments**, each on its own DigitalOcean droplet:

| Environment | Droplet Name | Branch |
|---|---|---|
| Production | `server-prod` | `master` |
| Staging | `server-dev` | `staging` |

Cloudflare handles DNS and sits in front of both.

---

## The Repos and What They Are

| Repo | What it is | Port | URL pattern |
|---|---|---|---|
| `sf-server-v2` | NestJS backend API + Nginx + Redis | 3000 (API), 81 (WebSocket) | `api.smoll.me` / `staging-api.smoll.me` |
| `sf-admin` | Vue/Vite admin portal | 5175 | `admin.smoll.me` / `staging-admin.smoll.me` |
| `sf-partner` | Vue/Vite partner portal | 5174 | `partner.smoll.me` / `staging-partner.smoll.me` |
| `sf-vetsuite` | Vue/Vite expert/vet portal | 5173 | `expert.smoll.me` / `staging-expert.smoll.me` |

---

## How GitHub Actions Deploys to DigitalOcean

Every repo has `.github/workflows/pipeline.yml`. It triggers on push to `master` (production) or `staging` branch.

**The deploy steps for each repo:**

1. **Connect via SSH** using secrets stored in GitHub repo settings: `HOST`, `USERNAME`, `SSH_PRIVATE_KEY`
2. **Copy files** to the droplet — admin/partner use `scp`, server/vetsuite use `rsync`
3. **Write a `.env` file** on the server with all the environment variables (API keys, DB URL, etc.)
4. **Rebuild the Docker container**: `docker-compose down → build → up -d`
5. **For `sf-server-v2` only**: also runs DB migrations (`yarn migration:run`) and seeds after container starts

The target droplet is determined by which branch was pushed to. All repos use the same conditional in `pipeline.yml`:

```yaml
HOST: ${{ github.ref == 'refs/heads/master' && secrets.HOST || secrets.STAGING_HOST }}
```

| Branch | GitHub Secret used | Droplet |
|---|---|---|
| `master` | `HOST` | `server-prod` |
| `staging` | `STAGING_HOST` | `server-dev` |

Both secrets are set per repo in GitHub → Repo → Settings → Secrets and variables → Actions.

---

## Docker Network: How Everything Connects

`sf-server-v2` owns the Docker Compose stack that creates the shared network (`sf-server_default`). It runs:
- `nginx` container (the reverse proxy)
- `app` container (the NestJS API)
- `redis` container

The three frontend repos (`sf-admin`, `sf-partner`, `sf-vetsuite`) each have their own `docker-compose.yml` that spins up a single container and **joins the existing `sf-server_default` network**:

```yaml
networks:
  default:
    name: sf-server_default
    external: true
```

> **`sf-server-v2` must be deployed first** before the frontends can come up, since it creates the shared network.

---

## How Nginx Routes Requests

Nginx lives inside the `sf-server-v2` stack (mounted from `nginx.conf`). It listens on port 80 and routes by **hostname** (`server_name`):

```
Incoming hostname          →  Upstream (Docker service:port)
─────────────────────────────────────────────────────────────
expert.smoll.me            →  localhost:5173  (sf-vetsuite container)
staging-expert.smoll.me    →  localhost:5173

partner.smoll.me           →  localhost:5174  (sf-partner container)
staging-partner.smoll.me   →  localhost:5174

admin.smoll.me             →  localhost:5175  (sf-admin container)
staging-admin.smoll.me     →  localhost:5175

api.smoll.me               →  app:3000        (backend API)
staging-api.smoll.me       →  app:3000

/socket (on any host)      →  app:81          (WebSocket)
```

The nginx container uses `host.docker.internal` to reach the frontend containers (which are on the host's Docker network, not inside the nginx container itself). For the API (`app`), it uses the Docker service name directly since they're in the same compose stack.

Nginx also handles:
- `client_max_body_size 100M` — for large file uploads
- WebSocket upgrade headers — for socket.io

---

## Cloudflare's Role

Cloudflare sits in front as the DNS provider. Each subdomain (`api.smoll.me`, `admin.smoll.me`, etc.) has an **A record** pointing to the DigitalOcean droplet's IP. With the proxy (orange cloud) enabled:
- SSL termination happens at Cloudflare (HTTPS → HTTP to the droplet)
- Nginx on the droplet receives plain HTTP on port 80
- DDoS protection and CDN caching come for free

> **Adding a new subdomain:** You need to (1) add an A record in Cloudflare DNS pointing to the droplet IP, (2) add a `server_name` block in `sf-server-v2/nginx.conf`, and (3) redeploy `sf-server-v2`.

---

## Deployment Order (Critical)

When setting up a fresh droplet from scratch:

1. **`sf-server-v2` first** — creates the Docker network, starts nginx, redis, and the API
2. **Then any order:** `sf-vetsuite`, `sf-partner`, `sf-admin` — they join the existing network

---

## Where Secrets Live

- GitHub Actions secrets per repo (set in GitHub → Repo → Settings → Secrets and variables → Actions)
- On the server, `.env` files are written to `~/app/<service>/` during each deploy
- Never committed to git
