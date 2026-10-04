#!/usr/bin/env bash
# Déploiement VPS (git pull + Docker) avec menu interactif / options de seed.
#
# Usage:
#   npm run deploy
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh 2          # choix direct
#   ./scripts/deploy.sh --help
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="@docker/docker-compose.yml"
# --env-file racine : nécessaire pour interpoler HOST_PORT dans ports:
# (env_file du compose injecte seulement dans le conteneur)
COMPOSE=(docker compose --env-file .env -f "$COMPOSE_FILE")
DO_PULL=1
DO_BUILD=1
DO_UP=1
SEED_SETLIST=0
SEED_PROPAL=0
DISCARD_GENERATED=1
CHOICE=""

usage() {
  cat <<'EOF'
Déploie h8f4 sur le serveur (pull + build + up Docker).

Usage:
  npm run deploy
  ./scripts/deploy.sh
  ./scripts/deploy.sh <n>          # choix direct (voir menu)
  ./scripts/deploy.sh --help

Sans argument, un menu numéroté est proposé :

  1) Déployer (pull + build + up)
  2) Déployer + seed setlist
  3) Déployer + seed Propal
  4) Déployer + seed setlist + Propal
  5) Seed setlist uniquement
  6) Seed Propal uniquement
  7) Seed setlist + Propal uniquement
  0) Annuler

Options avancées :
  --keep-local   Ne pas écarter live-assets.ts avant le pull
  -h, --help     Afficher cette aide
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

apply_choice() {
  case "$1" in
    1)
      DO_PULL=1; DO_BUILD=1; DO_UP=1
      SEED_SETLIST=0; SEED_PROPAL=0
      ;;
    2)
      DO_PULL=1; DO_BUILD=1; DO_UP=1
      SEED_SETLIST=1; SEED_PROPAL=0
      ;;
    3)
      DO_PULL=1; DO_BUILD=1; DO_UP=1
      SEED_SETLIST=0; SEED_PROPAL=1
      ;;
    4)
      DO_PULL=1; DO_BUILD=1; DO_UP=1
      SEED_SETLIST=1; SEED_PROPAL=1
      ;;
    5)
      DO_PULL=0; DO_BUILD=0; DO_UP=0
      SEED_SETLIST=1; SEED_PROPAL=0
      ;;
    6)
      DO_PULL=0; DO_BUILD=0; DO_UP=0
      SEED_SETLIST=0; SEED_PROPAL=1
      ;;
    7)
      DO_PULL=0; DO_BUILD=0; DO_UP=0
      SEED_SETLIST=1; SEED_PROPAL=1
      ;;
    0)
      echo "Annulé."
      exit 0
      ;;
    *)
      echo "Choix invalide : $1" >&2
      exit 1
      ;;
  esac
}

show_menu() {
  cat <<'EOF'

Déploiement h8f4 — choisis une option :

  1) Déployer (pull + build + up)
  2) Déployer + seed setlist
  3) Déployer + seed Propal
  4) Déployer + seed setlist + Propal
  5) Seed setlist uniquement
  6) Seed Propal uniquement
  7) Seed setlist + Propal uniquement
  0) Annuler

EOF
  local answer=""
  while true; do
    printf "Ton choix [1-7, 0] : "
    IFS= read -r answer || true
    case "$answer" in
      0|1|2|3|4|5|6|7)
        CHOICE="$answer"
        return 0
        ;;
      *)
        echo "Entre un numéro entre 0 et 7."
        ;;
    esac
  done
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --keep-local)
      DISCARD_GENERATED=0
      ;;
    [0-7])
      CHOICE="$1"
      ;;
    *)
      echo "Option inconnue : $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ -z "$CHOICE" ]]; then
  if [[ -t 0 ]]; then
    show_menu
  else
    echo "Entrée non interactive : précise un choix (ex. npm run deploy -- 1)" >&2
    usage >&2
    exit 1
  fi
fi

apply_choice "$CHOICE"

if [[ "$DO_PULL" -eq 1 || "$DO_BUILD" -eq 1 || "$DO_UP" -eq 1 ]]; then
  require_cmd git
  require_cmd docker
fi

if [[ "$SEED_SETLIST" -eq 1 || "$SEED_PROPAL" -eq 1 ]]; then
  require_cmd npm
fi

echo
echo "→ Choix $CHOICE sélectionné"

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

if [[ ! -f .env ]]; then
  echo "Fichier .env introuvable à la racine du projet." >&2
  exit 1
fi

if [[ "$DO_BUILD" -eq 1 ]]; then
  log "Docker build"
  "${COMPOSE[@]}" build
fi

if [[ "$DO_UP" -eq 1 ]]; then
  log "Docker up"
  "${COMPOSE[@]}" up -d --force-recreate
fi

if [[ "$SEED_PROPAL" -eq 1 ]]; then
  run_seed_propal
fi

if [[ "$SEED_SETLIST" -eq 1 ]]; then
  run_seed_setlist
fi

log "Terminé"
if [[ "$DO_UP" -eq 1 ]]; then
  "${COMPOSE[@]}" ps
  echo
  echo "Port hôte attendu (HOST_PORT) :"
  grep -E '^HOST_PORT=' .env || echo "(non défini → défaut 3000)"
fi
