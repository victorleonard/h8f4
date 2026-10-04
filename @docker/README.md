# Déploiement Docker (VPS OVH, etc.)

Le site et **Propal** tournent dans un conteneur Node.js (adaptateur `@astrojs/node` en mode standalone). Les données Propal sont stockées dans **SQLite** (fichier monté en volume).

## Prérequis

- Docker et Docker Compose sur le VPS
- Fichier `.env` à la racine du projet (voir `.env.example`)
- Médias sur le serveur : `public/live/`, `public/images/`, `public/og-image.png` (non versionnés dans Git)
- Dossier `data/` avec la base Propal et les membres seedés

## Variables d'environnement

Copier et compléter à la racine du projet :

```bash
cp .env.example .env
```

| Variable           | Obligatoire                                 | Rôle                                   |
| ------------------ | ------------------------------------------- | -------------------------------------- |
| `PROPAL_DB_PATH`        | Non (défaut Docker : `/app/data/propal.db`) | Fichier SQLite Propal            |
| `PROPAL_ADMIN_PASSWORD` | Oui (Admin membres)                         | Mot de passe administration Propal |
| `PUBLIC_SITE_URL`       | Recommandé                                  | URL canonique (build + runtime)  |
| `PUBLIC_BASE_PATH` | Non                                         | Sous-dossier éventuel (`/h8f4/`)       |
| `PUBLIC_NOINDEX`   | Non                                         | `true` pour bloquer l'indexation       |
| `HOST_PORT`        | Non                                         | Port exposé sur l'hôte (défaut `3000`) |

Variables optionnelles Spotify / YouTube : voir `.env.example`.

## Premier déploiement

```bash
# Sur le VPS
git clone <repo> h8f4 && cd h8f4

# Copier les médias depuis votre machine de dev (exemple)
# rsync -avz public/live public/images public/og-image.png user@vps:/chemin/h8f4/public/

cp .env.example .env
mkdir -p data
npm run seed:propal-members

docker compose --env-file .env -f @docker/docker-compose.yml build
docker compose --env-file .env -f @docker/docker-compose.yml up -d
```

Le site écoute sur `http://<vps>:$HOST_PORT` (défaut `3000`). **`--env-file .env` est obligatoire** pour que `HOST_PORT` du `.env` racine s’applique au mapping de ports (sinon Compose tombe sur 3000).

## Mise à jour

```bash
npm run deploy
```

Équivalent manuel :

```bash
git pull
docker compose --env-file .env -f @docker/docker-compose.yml build
docker compose --env-file .env -f @docker/docker-compose.yml up -d
```

### Menu de déploiement

`npm run deploy` propose un menu :

```text
1) Déployer (pull + build + up)
2) Déployer + seed setlist
3) Déployer + seed Propal
4) Déployer + seed setlist + Propal
5) Seed setlist uniquement
6) Seed Propal uniquement
7) Seed setlist + Propal uniquement
0) Annuler
```

Choix direct sans menu :

```bash
npm run deploy -- 2          # déployer + seed setlist
npm run deploy -- 5          # seed setlist uniquement
```

Le script écarte automatiquement `src/data/live-assets.ts` (et le compose localement modifié) avant le `git pull` pour éviter les conflits sur la prod. Utiliser `--keep-local` pour conserver les changements locaux.

> La base SQLite dans `data/` est persistée via le volume Docker. Les seeds du menu deploy tournent **dans Docker** (image `h8f4-web`) — **npm n’est pas requis** sur le VPS.

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

## Volumes

`@docker/docker-compose.yml` monte :

| Volume hôte           | Conteneur                            | Rôle                             |
| --------------------- | ------------------------------------ | -------------------------------- |
| `data/`               | `/app/data`                          | Base SQLite Propal (`propal.db`) |
| `public/live`         | `/app/dist/client/live` (ro)         | Vidéos et photos live            |
| `public/images`       | `/app/dist/client/images` (ro)       | Photo de groupe                  |
| `public/og-image.png` | `/app/dist/client/og-image.png` (ro) | Image Open Graph                 |

Sans les dossiers médias sur l'hôte, le site fonctionne mais les médias renverront 404.

Pour régénérer les médias après ajout de fichiers sources :

```bash
# En local (avec assets/live-assets/)
npm run build
# Puis rsync public/live et public/images vers le VPS
```

## Propal

1. Seed des membres : `npm run seed:propal-members` (avant ou après le premier déploiement, sur l'hôte si `data/` est partagé).
2. Sauvegarde : copier `data/propal.db`.
3. Les routes `/api/propal/*` sont servies par le même conteneur Node.

Voir `docs/PROPAL.md` pour le détail du fonctionnement et de l'API.

## Commandes utiles

```bash
docker compose --env-file .env -f @docker/docker-compose.yml logs -f web
docker compose --env-file .env -f @docker/docker-compose.yml ps
docker compose --env-file .env -f @docker/docker-compose.yml down
```

## Build local (test)

```bash
mkdir -p data
npm run seed:propal-members
docker compose --env-file .env -f @docker/docker-compose.yml build
docker compose --env-file .env -f @docker/docker-compose.yml up
# → http://localhost:$HOST_PORT/propal
```

## Fichiers

| Fichier              | Rôle                                             |
| -------------------- | ------------------------------------------------ |
| `Dockerfile`         | Image multi-étapes Node 22 + better-sqlite3      |
| `docker-compose.yml` | Service web + volumes médias et SQLite           |
| `../.dockerignore`   | Exclusions du contexte de build (racine du repo) |
