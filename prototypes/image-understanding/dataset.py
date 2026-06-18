"""저장된 라벨(_saved/)을 YOLO 학습용 데이터셋으로 묶기 (train/val 분할).

산출 구조(Ultralytics YOLO 표준):
    dataset/
      images/train/*.png   images/val/*.png
      labels/train/*.txt   labels/val/*.txt
      data.yaml            (nc, names, train/val 경로)

이미지는 원본(image.png)을 우선 쓰고, 없으면 annotated.png 로 대체한다.
분할은 무작위가 아니라 **결정적**(파일명 정렬 후 N번째를 val)이라 재현 가능하다.
"""

from __future__ import annotations

import json
import os
import shutil
import tempfile

from labeling import LabelRecord, from_record_dict, to_yolo


def _collect(saved_dir: str):
    """`_saved/<id>/` 들을 (record, 폴더경로) 목록으로. 라벨 있는 것만."""
    items = []
    if not os.path.isdir(saved_dir):
        return items
    for entry in sorted(os.listdir(saved_dir)):
        d = os.path.join(saved_dir, entry)
        meta = os.path.join(d, "meta.json")
        if not os.path.isfile(meta):
            continue
        try:
            with open(meta, encoding="utf-8") as f:
                rec = from_record_dict(json.load(f))
        except (OSError, json.JSONDecodeError):
            continue
        if rec.labels:
            items.append((rec, d, entry))
    return items


def _image_path(folder: str) -> str | None:
    """학습용 이미지 경로: 원본(image.png) 우선, 없으면 annotated.png."""
    for name in ("image.png", "annotated.png"):
        p = os.path.join(folder, name)
        if os.path.isfile(p):
            return p
    return None


def build_yolo_dataset(saved_dir: str, val_ratio: float = 0.2) -> tuple[str | None, dict]:
    """train/val 로 나눈 YOLO 데이터셋 zip 을 만든다.

    Returns:
        (zip 경로 또는 None, 통계 dict). 라벨이 하나도 없으면 (None, {...}).
    """
    items = _collect(saved_dir)
    stats = {"n_total": len(items), "n_train": 0, "n_val": 0, "n_skipped": 0, "classes": []}
    if not items:
        return None, stats

    # 전역 클래스맵(모든 레코드의 클래스 합집합, 정렬 → 일관된 id).
    classes = sorted({lb["class_name"] for rec, _, _ in items for lb in rec.labels})
    cmap = {name: i for i, name in enumerate(classes)}
    stats["classes"] = classes

    # 결정적 분할: val_ratio 로 step 계산 후 N번째를 val 로.
    step = max(2, round(1 / val_ratio)) if val_ratio > 0 else 0

    root = tempfile.mkdtemp(prefix="ds_")
    for sub in ("images/train", "images/val", "labels/train", "labels/val"):
        os.makedirs(os.path.join(root, sub), exist_ok=True)

    for idx, (rec, folder, entry) in enumerate(items):
        img = _image_path(folder)
        if img is None:
            stats["n_skipped"] += 1
            continue
        is_val = step and (idx % step == 0)
        split = "val" if is_val else "train"
        ext = os.path.splitext(img)[1] or ".png"
        stem = entry  # 폴더명(타임스탬프_파일명)으로 충돌 방지.

        shutil.copyfile(img, os.path.join(root, f"images/{split}", f"{stem}{ext}"))
        with open(os.path.join(root, f"labels/{split}", f"{stem}.txt"), "w", encoding="utf-8") as f:
            f.write(to_yolo(rec, cmap))

        if is_val:
            stats["n_val"] += 1
        else:
            stats["n_train"] += 1

    # data.yaml
    names_block = "\n".join(f"  {i}: {n}" for i, n in enumerate(classes))
    data_yaml = (
        f"path: .\ntrain: images/train\nval: images/val\n\n"
        f"nc: {len(classes)}\nnames:\n{names_block}\n"
    )
    with open(os.path.join(root, "data.yaml"), "w", encoding="utf-8") as f:
        f.write(data_yaml)

    zip_base = os.path.join(tempfile.mkdtemp(prefix="dszip_"), "yolo_dataset")
    zip_path = shutil.make_archive(zip_base, "zip", root)
    return zip_path, stats
