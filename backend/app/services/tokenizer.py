import re
from collections import Counter

# Patterns to strip before tokenizing (order matters)
_STRIP_PATTERNS: list[tuple[str, str]] = [
    (r"//.*", ""),                        # Line comments: // ...
    (r"/\*[\s\S]*?\*/", ""),              # Block comments: /* ... */
    (r'#"[^"]*"', ""),                    # Python single-line strings
    (r'"""[\s\S]*?"""', ""),              # Python triple-quoted strings
    (r"'''[\s\S]*?'''", ""),              # Python triple-quoted strings (single)
    (r'"(?:[^"\\]|\\.)*"', ""),           # Double-quoted strings with escapes
    (r"'(?:[^'\\]|\\.)*'", ""),           # Single-quoted strings with escapes
    (r"`[^`]*`", ""),                     # Template literals (JS)
    (r"<!--[\s\S]*?-->", ""),             # HTML comments
]

_TOKEN_PATTERN = re.compile(r"[a-zA-Z_][a-zA-Z0-9_]{1,}")


def tokenize_file(content: str) -> Counter[str]:
    """Return word-frequency Counter for a single file."""
    text = content
    for pattern, replacement in _STRIP_PATTERNS:
        text = re.sub(pattern, replacement, text)
    tokens = _TOKEN_PATTERN.findall(text)
    return Counter(t.lower() for t in tokens if len(t) >= 2)
