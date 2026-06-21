# Déploiement Docker (VPS OVH, etc.)

Le site et **Propal** tournent dans un conteneur Node.js (adaptateur `@astrojs/node` en mode standalone). Redis reste sur **Upstash** (API HTTP).

## Prérequis

- Docker et Docker Compose sur le VPS
- Fichier `.env` à la racine du projet (voir `.env.example`)
- Médias sur le serveur : `public/live/`, `public/images/`, `public/og-image.png` (non versionnés dans Git)

## Variables d'environnement

Copier et compléter à la racine du projet :

```bash
cp .env.example .env
```

| Variable | Obligatoire | Rôle |
| -------- | ----------- | ---- |
| `UPSTASH_REDIS_REST_URL` | Oui (Propal) | Base Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Oui (Propal) | Token Redis |
| `PUBLIC_SITE_URL` | Recommandé | URL canonique (build + runtime) |
| `PUBLIC_BASE_PATH` | Non | Sous-dossier éventuel (`/h8f4/`) |
| `PUBLIC_NOINDEX` | Non | `true` pour bloquer l'indexation |
| `HOST_PORT` | Non | Port exposé sur l'hôte (défaut `3000`) |

Variables optionnelles Spotify / YouTube : voir `.env.example`.

## Premier déploiement

```bash
# Sur le VPS
git clone <repo> h8f4 && cd h8f4

# Copier les médias depuis votre machine de dev (exemple)
# rsync -avz public/live public/images public/og-image.png user@vps:/chemin/h8f4/public/

cp .env.example .env
# Éditer .env (Upstash, PUBLIC_SITE_URL…)

docker compose -f @docker/docker-compose.yml build
docker compose -f @docker/docker-compose.yml up -d
```

Le site écoute sur `http://<vps>:3000` (ou le port défini par `HOST_PORT`).

## Mise à jour

```bash
git pull
docker compose -f @docker/docker-compose.yml build
docker compose -f @docker/docker-compose.yml up -d
```

## Reverse proxy (Nginx)

Exemple de bloc serveur derrière Nginx + Let's Encrypt :

```nginx
server {
    listen 443 ssl http2;
    server_name h8f4.fr;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Volumes médias

`@docker/docker-compose.yml` monte en lecture seule :

- `public/live` → vidéos et photos live
- `public/images` → photo de groupe
- `public/og-image.png` → image Open Graph

Sans ces dossiers sur l'hôte, le site fonctionne mais les médias renverront 404.

Pour régénérer les médias après ajout de fichiers sources :

```bash
# En local (avec assets/live-assets/)
npm run build
# Puis rsync public/live et public/images vers le VPS
```

## Propal

Configurer les membres dans Upstash (voir `docs/PROPAL.md`). Les routes `/api/propal/*` sont servies par le même conteneur Node.

## Commandes utiles

```bash
docker compose -f @docker/docker-compose.yml logs -f web
docker compose -f @docker/docker-compose.yml ps
docker compose -f @docker/docker-compose.yml down
```

## Build local (test)

```bash
docker compose -f @docker/docker-compose.yml build
docker compose -f @docker/docker-compose.yml up
# → http://localhost:3000/propal
```

## Fichiers

| Fichier | Rôle |
| ------- | ---- |
| `Dockerfile` | Image multi-étapes Node 22 |
| `docker-compose.yml` | Service web + volumes médias |
| `../.dockerignore` | Exclusions du contexte de build (racine du repo) |
