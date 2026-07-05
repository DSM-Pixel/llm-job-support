#!/usr/bin/env bash
# 서버(라즈베리파이)에서 실행되는 배포 스크립트.
#
# upstream/main 을 병합하고, 변경 범위에 따라 앱을 갱신한다:
#   - 의존성/이미지/compose 변경 → 재빌드(up -d --build)
#   - 백엔드 코드만 변경        → 재시작(restart)
#   - 정적(web/docs)만 변경     → 재시작 불필요
#
# CD(GitHub Actions)가 SSH 로 이 스크립트를 stdin 파이프해 호출한다.
# 사람이 수동으로 `bash deploy/remote-deploy.sh` 해도 동일하게 동작한다.
set -euo pipefail

REPO="/home/dsm/llm-job-support"
APP="llm-job-support-app"
cd "$REPO"

before="$(git rev-parse HEAD)"
git fetch upstream --quiet

# 서버는 자체 커밋(raspi-ver 조정)이 있어 fast-forward 가 아닐 수 있다 → 병합 커밋 허용.
# 충돌 시엔 자동 해결하지 않고 실패시켜(사람이 개입) 잘못된 배포를 막는다.
if ! git merge --no-edit upstream/main; then
  git merge --abort || true
  echo "::error:: 병합 충돌 — 수동 해결이 필요합니다. 배포를 중단합니다."
  exit 1
fi

after="$(git rev-parse HEAD)"
if [ "$before" = "$after" ]; then
  echo "변경 없음 — 이미 최신($after). 재시작 생략."
  exit 0
fi

changed="$(git diff --name-only "$before" "$after")"
echo "── 변경 파일 ──"
echo "$changed"
echo "───────────────"

need_health=0
if echo "$changed" | grep -qE '(^|/)(pyproject\.toml|uv\.lock|requirements.*\.txt|Dockerfile|docker-compose\.ya?ml)$'; then
  echo "의존성/이미지/compose 변경 → up -d --build"
  docker compose up -d --build app
  need_health=1
elif echo "$changed" | grep -qE '^backend/'; then
  echo "백엔드 코드 변경 → restart"
  docker compose restart app
  need_health=1
else
  echo "정적(web/docs)만 변경 → 재시작 불필요"
fi

# 재시작/재빌드한 경우에만 헬스 체크(최대 ~30초).
if [ "$need_health" = "1" ]; then
  for _ in $(seq 1 15); do
    if docker exec "$APP" python -c \
      "import urllib.request; urllib.request.urlopen('http://127.0.0.1:80/api/health')" 2>/dev/null; then
      echo "헬스 체크 OK"
      echo "배포 완료: $after"
      exit 0
    fi
    sleep 2
  done
  echo "::error:: 헬스 체크 타임아웃 — 앱이 정상 기동하지 못했습니다."
  exit 1
fi

echo "배포 완료: $after"
