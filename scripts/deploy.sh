#!/usr/bin/env bash
# Déploiement VPS (git pull + Docker) avec options de seed SQLite.
#
# Usage:
#   npm run deploy
#   npm run deploy -- --seed-setlist
#   ./scripts/deploy.sh --help
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="@docker/docker-compose.yml"
DO_PULL=1
DO_BUILD=1
DO_UP=1
SEED_SETLIST=0
SEED_PROPAL=0
SEED_ONLY=0
DISCARD_GENERATED=1

usage() {
  cat <<'EOF'
Déploie h8f4 sur le serveur (pull + build + up Docker).

Usage:
  ./scripts/deploy.sh [options]
  npm run deploy -- [options]

Options:
  --seed-setlist       Seed titres + setlist « Concert » après le déploiement
  --seed-propal        Seed membres Propal après le déploiement
  --seed-all           Seed setlist + Propal
  --seed-only          Uniquement les seeds (pas de pull / build / up)
  --no-pull            Ne pas faire git pull
  --no-build           Ne pas rebuild l’image Docker
  --no-up              Ne pas relancer les conteneurs
  --keep-local         Ne pas écarter live-assets.ts généré avant le pull
  -h, --help           Afficher cette aide

Exemples:
  ./scripts/deploy.sh
  ./scripts/deploy.sh --seed-setlist
  ./scripts/deploy.sh --seed-all
  ./scripts/deploy.sh --seed-only --seed-setlist
EOF
}

log() {
  printf '\n==> %s\n' "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Commande introuvable : $1" >&2
    exit 1
  fi
}

run_seed_setlist() {
  log "Seed setlist (titres + Concert)"
  mkdir -p data
  npm run seed:setlist
}

run_seed_propal() {
  log "Seed membres Propal"
  mkdir -p data
  npm run seed:propal-members
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --seed-setlist) SEED_SETLIST=1 ;;
    --seed-propal) SEED_PROPAL=1 ;;
    --seed-all)
      SEED_SETLIST=1
      SEED_PROPAL=1
      ;;
    --seed-only)
      SEED_ONLY=1
      DO_PULL=0
      DO_BUILD=0
      DO_UP=0
      ;;
    --no-pull) DO_PULL=0 ;;
    --no-build) DO_BUILD=0 ;;
    --no-up) DO_UP=0 ;;
    --keep-local) DISCARD_GENERATED=0 ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Option inconnue : $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ "$SEED_ONLY" -eq 1 && "$SEED_SETLIST" -eq 0 && "$SEED_PROPAL" -eq 0 ]]; then
  echo "--seed-only nécessite --seed-setlist, --seed-propal ou --seed-all" >&2
  exit 1
fi

if [[ "$SEED_ONLY" -eq 0 ]]; then
  require_cmd git
  require_cmd docker
fi

if [[ "$SEED_SETLIST" -eq 1 || "$SEED_PROPAL" -eq 1 ]]; then
  require_cmd npm
fi

if [[ "$DO_PULL" -eq 1 ]]; then
  log "Git pull"
  if [[ "$DISCARD_GENERATED" -eq 1 ]]; then
    # Fichier régénéré au build — évite le blocage du pull sur la prod.
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      git restore --worktree --staged -- "src/data/live-assets.ts" 2>/dev/null || true
    fi
  fi
  git pull --ff-only
fi

if [[ "$DO_BUILD" -eq 1 ]]; then
  log "Docker build"
  docker compose -f "$COMPOSE_FILE" build
fi

if [[ "$DO_UP" -eq 1 ]]; then
  log "Docker up"
  docker compose -f "$COMPOSE_FILE" up -d
fi

if [[ "$SEED_PROPAL" -eq 1 ]]; then
  run_seed_propal
fi

if [[ "$SEED_SETLIST" -eq 1 ]]; then
  run_seed_setlist
fi

log "Déploiement terminé"
if [[ "$DO_UP" -eq 1 ]]; then
  docker compose -f "$COMPOSE_FILE" ps
fi
