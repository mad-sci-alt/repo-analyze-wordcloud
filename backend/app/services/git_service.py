import shutil
from pathlib import Path
from git import Repo
from git.exc import GitCommandError
from ..config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE, SKIP_DIRS


def clone_repository(url: str, branch: str, dest_dir: Path) -> Path:
    """Clone `url` at `branch` into `dest_dir`. Returns path to repo root."""
    try:
        repo = Repo.clone_from(
            url,
            dest_dir,
            branch=branch,
            depth=1,
            env={"GIT_TERMINAL_PROMPT": "0"},
        )
        return Path(repo.working_tree_dir)
    except GitCommandError as e:
        raise ValueError(f"Git clone failed: {e.stderr}")


def extract_code_files(repo_root: Path):
    """
    Walk repo_root, yield (file_path, content) for allowed file types.
    Skips binary/too-large files and SKIP_DIRS directories.
    """
    for path in _walk_files(repo_root):
        if path.is_file() and path.suffix.lower() in ALLOWED_EXTENSIONS:
            if path.stat().st_size > MAX_FILE_SIZE:
                continue
            try:
                content = path.read_text(encoding="utf-8", errors="ignore")
                yield path, content
            except OSError:
                continue


def _walk_files(root: Path):
    """Recursively walk, skipping SKIP_DIRS."""
    for item in root.rglob("*"):
        # Check if any part of the path is a skip dir
        parts = item.parts
        if any(d in SKIP_DIRS for d in parts):
            continue
        yield item
