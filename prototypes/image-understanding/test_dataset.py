"""데이터셋 분할/내보내기(dataset.build_yolo_dataset) 테스트 — API/torch 불필요.

실행: python prototypes/image-understanding/test_dataset.py
"""

import json
import os
import tempfile
import zipfile

from PIL import Image

import dataset


def _make_saved(n: int) -> str:
    """임시 _saved 구조: n개 레코드(meta + image.png) 생성."""
    root = tempfile.mkdtemp(prefix="saved_")
    for i in range(n):
        d = os.path.join(root, f"2026_x_img{i}")
        os.makedirs(d)
        Image.new("RGB", (50, 50), "gray").save(os.path.join(d, "image.png"))
        cls = "포트홀" if i % 2 == 0 else "균열"
        with open(os.path.join(d, "meta.json"), "w", encoding="utf-8") as f:
            json.dump(
                {"image_filename": f"img{i}.png", "image_width": 50, "image_height": 50,
                 "labels": [{"class_name": cls, "box_2d": [0, 0, 25, 25]}]},
                f, ensure_ascii=False,
            )
    return root


def test_split_counts_and_structure():
    root = _make_saved(10)
    zip_path, st = dataset.build_yolo_dataset(root, val_ratio=0.2)
    assert zip_path and os.path.exists(zip_path)
    assert st["n_total"] == 10
    # val_ratio 0.2 → step 5 → 10장 중 idx 0,5 가 val = 2장.
    assert st["n_val"] == 2
    assert st["n_train"] == 8
    assert st["classes"] == ["균열", "포트홀"]  # 정렬

    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
    assert "data.yaml" in names
    # 디렉터리 엔트리는 제외하고 실제 파일만 센다.
    assert sum(1 for n in names if n.startswith("images/train/") and n.endswith(".png")) == 8
    assert sum(1 for n in names if n.startswith("images/val/") and n.endswith(".png")) == 2
    assert sum(1 for n in names if n.startswith("labels/train/") and n.endswith(".txt")) == 8


def test_data_yaml_content():
    root = _make_saved(4)
    zip_path, _ = dataset.build_yolo_dataset(root, val_ratio=0.25)
    with zipfile.ZipFile(zip_path) as z:
        yaml = z.read("data.yaml").decode("utf-8")
    assert "nc: 2" in yaml
    assert "train: images/train" in yaml
    assert "포트홀" in yaml and "균열" in yaml


def test_deterministic_split():
    root = _make_saved(10)
    _, a = dataset.build_yolo_dataset(root, 0.2)
    _, b = dataset.build_yolo_dataset(root, 0.2)
    assert (a["n_train"], a["n_val"]) == (b["n_train"], b["n_val"])  # 재현 가능


def test_empty_returns_none():
    root = tempfile.mkdtemp(prefix="empty_")
    zip_path, st = dataset.build_yolo_dataset(root, 0.2)
    assert zip_path is None
    assert st["n_total"] == 0


if __name__ == "__main__":
    passed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"  PASS {name}")
            passed += 1
    print(f"\n{passed} tests passed.")
