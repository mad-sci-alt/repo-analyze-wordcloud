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

# Reverse map: extension suffix → human-readable language name
EXT_TO_LANG: dict[str, str] = {
    ".js":    "JavaScript",
    ".jsx":   "JavaScript",
    ".ts":    "TypeScript",
    ".tsx":   "TypeScript",
    ".vue":   "Vue",
    ".svelte":"Svelte",
    ".py":    "Python",
    ".rb":    "Ruby",
    ".php":   "PHP",
    ".pl":    "Perl",
    ".pm":    "Perl",
    ".r":     "R",
    ".c":     "C",
    ".cpp":   "C++",
    ".cc":    "C++",
    ".h":     "C Header",
    ".hpp":   "C++ Header",
    ".java":  "Java",
    ".kt":    "Kotlin",
    ".kts":   "Kotlin",
    ".cs":    "C#",
    ".go":    "Go",
    ".rs":    "Rust",
    ".swift": "Swift",
    ".sh":    "Shell",
    ".bash":  "Shell",
    ".zsh":   "Shell",
    ".fish":  "Fish",
    ".ps1":   "PowerShell",
    ".yaml":  "YAML",
    ".yml":   "YAML",
    ".toml":  "TOML",
    ".json":  "JSON",
    ".xml":   "XML",
    ".html":  "HTML",
    ".css":   "CSS",
    ".scss":  "SCSS",
    ".sass":  "Sass",
    ".less":  "Less",
    ".md":    "Markdown",
    ".rst":   "reStructuredText",
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
