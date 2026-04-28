import tempfile
from pathlib import Path
from functools import lru_cache

ALLOWED_EXTENSIONS: set[str] = {
    # Web / frontend
    ".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte",
    # Backend / scripting
    ".py", ".rb", ".php", ".pl", ".pm", ".r",
    # Systems
    ".c", ".cpp", ".cc", ".h", ".hpp", ".java", ".kt", ".kts", ".cs", ".go",
    ".rs", ".swift",
    # Shell
    ".sh", ".bash", ".zsh", ".fish", ".ps1",
    # Data / config / markup
    ".yaml", ".yml", ".toml", ".json", ".xml", ".html", ".css", ".scss", ".sass", ".less",
    ".md", ".rst",
}

# Skip these directories during file extraction
SKIP_DIRS: set[str] = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    "vendor", "dist", "build", "target", ".next", ".nuxt",
    "coverage", ".pytest_cache", ".mypy_cache", ".tox",
}

MAX_FILE_SIZE: int = 1 * 1024 * 1024  # 1 MB


@lru_cache
def get_temp_dir() -> Path:
    return Path(tempfile.mkdtemp(prefix="github-wordcloud-"))
