#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=""
else
  SUDO="sudo"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deploy/oci"
ENV_FILE="${DEPLOY_DIR}/.env.oci"

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Missing required file: $1" >&2
    exit 1
  fi
}

for model in \
  fastapi_service/model.onnx \
  fastapi_service/wide9.onnx; do
  require_file "${ROOT_DIR}/${model}"
done

${SUDO} apt-get update
${SUDO} apt-get install -y --no-install-recommends ca-certificates curl openssl docker.io docker-compose-v2 ufw
${SUDO} systemctl enable --now docker

if [[ ! -f "${ENV_FILE}" ]]; then
  public_ip="$(curl -4fsS https://api.ipify.org)"
  if [[ ! "${public_ip}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Unable to determine the VM public IPv4 address" >&2
    exit 1
  fi

  dashed_ip="${public_ip//./-}"
  public_host="watermelon-${dashed_ip}.sslip.io"
  jwt_secret="$(openssl rand -base64 48 | tr -d '\n')"
  storage_secret="$(openssl rand -base64 48 | tr -d '\n')"

  umask 077
  cat >"${ENV_FILE}" <<EOF
PUBLIC_HOST=${public_host}
APP_URL=https://${public_host}
ALLOWED_ORIGINS=https://${public_host},https://acoustic-fruit-ripeness.web.app,https://localhost,capacitor://localhost
JWT_SECRET=${jwt_secret}
STORAGE_SECRET=${storage_secret}
LOCAL_CHAT_MODEL=qwen3.5:4b
CHAT_ENABLE_GEMINI=0
VISION_ENABLE_CLAUDE=0
EOF
fi

mkdir -p "${DEPLOY_DIR}/state/data" "${DEPLOY_DIR}/state/uploads"
${SUDO} chown -R 10001:10001 "${DEPLOY_DIR}/state/data" "${DEPLOY_DIR}/state/uploads"
chmod 700 "${DEPLOY_DIR}/state" "${DEPLOY_DIR}/state/data" "${DEPLOY_DIR}/state/uploads"

${SUDO} ufw allow OpenSSH
${SUDO} ufw allow 80/tcp
${SUDO} ufw allow 443/tcp
${SUDO} ufw allow 443/udp
${SUDO} ufw --force enable

cd "${DEPLOY_DIR}"
${SUDO} docker compose --env-file .env.oci pull caddy ollama
${SUDO} docker compose --env-file .env.oci build --pull api vision
${SUDO} docker compose --env-file .env.oci up -d ollama vision
${SUDO} docker compose --env-file .env.oci --profile bootstrap run --rm ollama-pull
${SUDO} docker compose --env-file .env.oci up -d

public_host="$(sed -n 's/^PUBLIC_HOST=//p' "${ENV_FILE}")"
for attempt in $(seq 1 36); do
  if curl -fsS --max-time 15 "https://${public_host}/api/v1/health" >/dev/null; then
    echo "Watermelon AI is online: https://${public_host}"
    exit 0
  fi
  sleep 5
done

echo "Deployment started but the HTTPS health check did not pass." >&2
echo "Check OCI ingress ports 80/443 and run: docker compose logs --tail=200" >&2
exit 1
