from __future__ import annotations

import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def test_validate_interactable_selectors_suite_passes() -> None:
    result = subprocess.run(
        [sys.executable, "-m", "robot", "validate_interactable_selectors.robot"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + "\n" + result.stderr
    assert "1 test, 1 passed, 0 failed" in result.stdout
