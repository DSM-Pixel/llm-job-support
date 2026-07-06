#!/usr/bin/env bash
# frontend(React) 를 빌드해 web/react/ 로 배포한다.
# app.py 가 web/react/ 가 있으면 그걸 서빙하므로, 이 스크립트 실행 후 web/react 를
# 커밋·push 하면 라이브에 반영된다(현 CD: git merge). 바닐라 web/ 는 폴백용으로 유지.
#
# 사용: (repo 루트에서) bash frontend/build-to-web.sh  그리고  git add web/react && git commit && git push
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"       # frontend/
ROOT="$(cd "$HERE/.." && pwd)"              # repo 루트
DEST="$ROOT/web/react"

cd "$HERE"
npm ci --silent 2>/dev/null || npm install --silent
npm run build

rm -rf "$DEST"
mkdir -p "$DEST"
cp -r "$HERE/dist/"* "$DEST/"
echo "web/react 갱신 완료: $(find "$DEST" -type f | wc -l) 파일"
echo "다음: git add web/react && git commit -m '프론트 빌드 갱신' && git push"
