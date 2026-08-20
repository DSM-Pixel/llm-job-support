# 모델 가중치 (best.pt · vehicle.pt)

라벨링 "AI 자동 탐지"는 이 폴더의 두 학습 모델을 함께 사용합니다
(둘 다 YOLO **세그멘테이션**, 62M 파라미터 / ~125MB):

- `best.pt` — 포트홀(`pothole`) 탐지
- `vehicle.pt` — 차량(`bus`/`car`/`truck`) 탐지

`detect_all_boxes` 가 둘을 함께 돌려 포트홀 + 차량을 한 번에 라벨링합니다
(일반 객체용 `yolov8n.pt` 는 차량류를 제외하고 보조로 사용). 가중치 파일은
용량이 커서 git에 커밋하지 않습니다(`.gitignore`의 `*.pt`).

## best.pt 두는 법 (권장: 스크립트로 자동 내려받기)

공개 Google Drive 에 올려둔 모델을 스크립트로 받아 이 경로에 배치합니다:

```bash
pip install gdown                       # 최초 1회
python scripts/fetch_pothole_model.py   # → backend/storage/models/best.pt
```

이 경로에 `best.pt`가 있으면 실제 탐지가 켜집니다:

```
backend/storage/models/best.pt
```

- 출처: 팀 공유 Drive 폴더 `pothole_rode_test/weights/best.pt` (직접 학습, imgsz 640)
- 또는 `backend/ml/finetuning/train_yolo.py` 로 직접 학습해 생성

## 없을 때

파일이 없거나 ultralytics/torch 미설치 시, `yolo_service` 가 자동으로 MOCK 박스로
폴백하므로 UI는 그대로 동작합니다(탐지 결과만 가짜).

실제 탐지 의존성 설치:

```bash
uv pip install -e ".[vision]"   # ultralytics, opencv-python, torch
```
