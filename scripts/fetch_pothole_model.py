"""라벨링 YOLO 모델 내려받기 — backend/storage/models/ 에 배치.

모델 가중치(*.pt)는 용량이 커 git 에 싣지 않는다(.gitignore). 대신 공개 Google
Drive 에 올려두고, 서버·개발 PC 어디서든 이 스크립트로 같은 모델을 받아 쓴다.

두 개의 학습 모델(둘 다 YOLO 세그멘테이션, 62M/125MB):
  - best.pt    : 포트홀(pothole) 탐지
  - vehicle.pt : 차량(bus/car/truck) 탐지
detect_all_boxes 가 둘을 함께 돌려 포트홀 + 차량을 한 번에 라벨링한다.

사용:
    python scripts/fetch_pothole_model.py            # 없는 것만 받기
    python scripts/fetch_pothole_model.py --force     # 항상 다시 받기

실제 탐지가 켜지려면 ultralytics·torch 도 필요:  uv pip install -e ".[vision]"
"""

from __future__ import annotations

import sys
from pathlib import Path

_MODELS_DIR = Path(__file__).resolve().parent.parent / "backend" / "storage" / "models"
_MIN_BYTES = 100_000_000  # 정상 모델은 ~125MB. 이보다 작으면 실패(HTML 오류 페이지 등)로 간주.

# (파일명, 공개 Drive 파일 ID) — 폴더가 아니라 파일 단건이라 대용량도 안정적으로 받힌다.
_MODELS = [
    ("best.pt", "1ha2Q3irp3lAZb5OM1RIHDMFJmJ9XqQ6N"),  # 포트홀
    ("vehicle.pt", "17tBQ7zFqLTvcckdE4CPojFgf0ahDqpje"),  # 차량(bus/car/truck)
]


def main() -> int:
    force = "--force" in sys.argv
    _MODELS_DIR.mkdir(parents=True, exist_ok=True)

    try:
        import gdown
    except ImportError:
        print("gdown 이 필요합니다. 설치: pip install gdown", file=sys.stderr)
        return 2

    rc = 0
    for name, file_id in _MODELS:
        dest = _MODELS_DIR / name
        if dest.is_file() and dest.stat().st_size >= _MIN_BYTES and not force:
            print(f"이미 있음(건너뜀): {name} ({dest.stat().st_size / 1e6:.0f}MB)")
            continue
        print(f"내려받는 중 → {dest}")
        gdown.download(f"https://drive.google.com/uc?id={file_id}", str(dest), quiet=False)
        if not dest.is_file() or dest.stat().st_size < _MIN_BYTES:
            print(f"다운로드 실패: {name} (없거나 너무 작음). 공유 권한 확인.", file=sys.stderr)
            rc = 1
        else:
            print(f"완료: {name} ({dest.stat().st_size / 1e6:.0f}MB)")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
