import shutil
from pathlib import Path
from git import Repo
from git.exc import GitCommandError
from ..config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE, SKIP_DIRS


def clone_repository(url: str, branch: str, dest_dir: Path, depth: int | None = None) -> tuple[Path, Repo]:
    """Clone `url` at `branch` into `dest_dir`. Returns (repo_root, Repo object)."""
    try:
        kwargs: dict = {
            "branch": branch,
            "env": {"GIT_TERMINAL_PROMPT": "0"},
        }
        if depth is not None:
            kwargs["depth"] = depth
        repo = Repo.clone_from(url, dest_dir, **kwargs)
        return Path(repo.working_tree_dir), repo
    except GitCommandError as e:
        raise ValueError(f"Git clone failed: {e.stderr}")


def extract_code_files(repo_root: Path):
    """
    Walk repo_root, yield (file_path, content) for allowed file types.
    Skips binary/too-large files and SKIP_DIRS directories.
    file_path is relative to repo_root for consistent path display.
    """
    for path in _walk_files(repo_root):
        if path.is_file() and path.suffix.lower() in ALLOWED_EXTENSIONS:
            if path.stat().st_size > MAX_FILE_SIZE:
                continue
            try:
                content = path.read_text(encoding="utf-8", errors="ignore")
                # Return relative path for consistent display
                rel = path.relative_to(repo_root)
                yield rel, content
            except OSError:
                continue


def _walk_files(root: Path):
    """Recursively walk, skipping SKIP_DIRS."""
    for item in root.rglob("*"):
        parts = item.parts
        if any(d in SKIP_DIRS for d in parts):
            continue
        yield item


def analyze_local_directory(local_path: str) -> tuple[Path, None]:
    """
    Validate a local directory path and return (absolute_path, None).
    Returns None as the second element since local dirs have no Repo object.
    Raises ValueError if the path is invalid or not a directory.
    """
    path = Path(local_path).resolve()
    if not path.exists():
        raise ValueError(f"Local path does not exist: {local_path}")
    if not path.is_dir():
        raise ValueError(f"Local path is not a directory: {local_path}")
    return path, None
