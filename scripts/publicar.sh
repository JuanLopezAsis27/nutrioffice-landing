#!/usr/bin/env bash
# =============================================================================
# Publica el sitio a mano, sin pasar por GitHub Actions.
#
# Hace lo mismo que el workflow `desplegar.yml`: sube `dist/` a una carpeta
# nueva por versión y recién después mueve el enlace `current`. Sirve para un
# arreglo urgente con Actions caído, o para el primer despliegue —cuando
# todavía no hay secretos cargados—.
#
#   npm run build && npm run verificar
#   VPS_HOST=1.2.3.4 VPS_USUARIO=deploy \
#     VPS_RUTA=/home/deploy/apps/nutrioffice-landing \
#     ./scripts/publicar.sh
#
# O dejando las variables en un archivo `.env.despliegue` (que está ignorado
# por git) y corriendo `./scripts/publicar.sh` a secas.
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck source=/dev/null
[ -f .env.despliegue ] && . ./.env.despliegue

: "${VPS_HOST:?Falta VPS_HOST}"
: "${VPS_USUARIO:?Falta VPS_USUARIO}"
: "${VPS_RUTA:?Falta VPS_RUTA}"
PUERTO="${VPS_PUERTO:-22}"

if [ ! -d dist ]; then
  echo "No existe dist/. Corré 'npm run build' antes." >&2
  exit 1
fi

SSH="ssh -p $PUERTO"
VERSION="$(date -u +%Y%m%d-%H%M%S)-manual"
DESTINO="$VPS_RUTA/releases/$VERSION"

echo "==> Versión $VERSION"

$SSH "$VPS_USUARIO@$VPS_HOST" "mkdir -p '$DESTINO'"
rsync -az --delete --progress -e "$SSH" dist/ "$VPS_USUARIO@$VPS_HOST:$DESTINO/"

# El cambio de versión es un rename del enlace: o se ve la anterior o la nueva.
$SSH "$VPS_USUARIO@$VPS_HOST" "
  set -e
  ln -sfn '$DESTINO' '$VPS_RUTA/current.nuevo'
  mv -Tf '$VPS_RUTA/current.nuevo' '$VPS_RUTA/current'
  ls -1dt '$VPS_RUTA'/releases/*/ | tail -n +6 | xargs -r rm -rf
"

echo "==> Publicada."
echo "    Versiones en el servidor:"
$SSH "$VPS_USUARIO@$VPS_HOST" "ls -1dt '$VPS_RUTA'/releases/*/ | head -5"
