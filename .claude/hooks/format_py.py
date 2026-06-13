"""PostToolUse hook: Edit/Write/MultiEdit가 .py 파일을 수정했을 때 ruff format + check 적용.

ruff가 설치되지 않았거나 파일이 .py가 아니면 조용히 통과한다.
실패해도 사용자 흐름을 막지 않도록 항상 exit 0.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_input = payload.get("tool_input") or {}
    file_path = tool_input.get("file_path") or tool_input.get("path")
    if not file_path:
        return 0

    p = Path(file_path)
    if p.suffix.lower() != ".py":
        return 0
    if not p.exists():
        return 0

    ruff = shutil.which("ruff")
    if not ruff:
        return 0

    try:
        subprocess.run(
            [ruff, "format", str(p)],
            timeout=15,
            capture_output=True,
            check=False,
        )
        result = subprocess.run(
            [ruff, "check", "--fix", "--exit-zero", str(p)],
            timeout=15,
            capture_output=True,
            check=False,
            text=True,
        )
        # ruff check 결과 중 남은 경고만 stderr로 흘려 Claude가 확인할 수 있게 한다.
        leftover = (result.stdout or "").strip()
        if leftover and "All checks passed" not in leftover:
            print(f"[ruff] {leftover}", file=sys.stderr)
    except Exception:
        pass

    return 0


if __name__ == "__main__":
    sys.exit(main())
