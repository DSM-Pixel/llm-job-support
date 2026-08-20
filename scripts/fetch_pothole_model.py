"""포트홀 탐지 YOLO 모델(best.pt) 내려받기 — backend/storage/models/best.pt 에 배치.

모델 가중치(*.pt)는 용량이 커 git 에 싣지 않는다(.gitignore). 대신 공개 Google
Drive 에 올려두고, 서버·개발 PC 어디서든 이 스크립트로 같은 모델을 받아 쓴다.

모델: pothole 세그멘테이션(YOLO, 단일 클래스 'pothole', 62M 파라미터 / 125MB).
출처: 프로젝트 팀 공유 Drive 폴더(pothole_rode_test/weights/best.pt).

사용:
    python scripts/fetch_pothole_model.py           # 없으면 받고, 있으면 건너뜀
    python scripts/fetch_pothole_model.py --force    # 항상 다시 받기

이 스크립트가 성공하면 라벨링 'AI 자동 탐지'가 Gemini/GPT 대신 로컬 YOLO 로
동작한다(단, ultralytics·torch 가 설치돼 있어야 함: uv pip install -e ".[vision]").
"""

from __future__ import annotations

import sys
from pathlib import Path

# 공개 Drive 파일 ID(best.pt) — 폴더가 아니라 파일 단건이라 대용량도 안정적으로 받힌다.
_FILE_ID = "1ha2Q3irp3lAZb5OM1RIHDMFJmJ9XqQ6N"
_DEST = Path(__file__).resolve().parent.parent / "backend" / "storage" / "models" / "best.pt"
_MIN_BYTES = 100_000_000  # 정상 모델은 ~125MB. 이보다 작으면 HTML 오류 페이지 등 실패로 간주.


def main() -> int:
    force = "--force" in sys.argv
    _DEST.parent.mkdir(parents=True, exist_ok=True)

    if _DEST.is_file() and _DEST.stat().st_size >= _MIN_BYTES and not force:
        print(f"이미 있음(건너뜀): {_DEST} ({_DEST.stat().st_size / 1e6:.0f}MB)")
        print("다시 받으려면 --force")
        return 0

    try:
        import gdown
    except ImportError:
        print("gdown 이 필요합니다. 설치: pip install gdown", file=sys.stderr)
        return 2

    import gdown

    print(f"내려받는 중 → {_DEST}")
    url = f"https://drive.google.com/uc?id={_FILE_ID}"
    gdown.download(url, str(_DEST), quiet=False)

    if not _DEST.is_file() or _DEST.stat().st_size < _MIN_BYTES:
        print(
            "다운로드 실패(파일이 없거나 너무 작음). 폴더 공유 권한을 확인하세요.", file=sys.stderr
        )
        return 1
    print(f"완료: {_DEST} ({_DEST.stat().st_size / 1e6:.0f}MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
