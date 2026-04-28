from collections import Counter

# NLTK English stopwords — hardcoded to avoid network dependency in Docker
_ENGLISH_STOP: set[str] = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you",
    "your", "yours", "yourself", "yourselves", "he", "him", "his",
    "himself", "she", "her", "hers", "herself", "it", "its", "itself",
    "they", "them", "their", "theirs", "themselves", "what", "which",
    "who", "whom", "this", "that", "these", "those", "am", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "having",
    "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if",
    "or", "because", "as", "until", "while", "of", "at", "by", "for",
    "with", "about", "against", "between", "into", "through", "during",
    "before", "after", "above", "below", "to", "from", "up", "down", "in",
    "out", "on", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "each",
    "few", "more", "most", "other", "some", "such", "no", "nor", "not",
    "only", "own", "same", "so", "than", "too", "very", "s", "t", "can",
    "will", "just", "don", "should", "now",
}

_CODE_STOP: set[str] = {
    # Programming language keywords
    "import", "from", "export", "default", "const", "let", "var",
    "function", "func", "def", "class", "interface", "struct", "enum",
    "return", "if", "else", "elif", "switch", "case", "for", "while",
    "do", "break", "continue", "try", "catch", "except", "finally",
    "throw", "raises", "async", "await", "yield", "static", "public",
    "private", "protected", "readonly", "abstract", "extends", "implements",
    "new", "this", "self", "super", "none", "null", "nil", "true", "false",
    "void", "type", "alias", "module", "namespace", "package", "use", "as",
    "in", "of", "is", "and", "or", "not", "with", "without", "get", "set",
    # Single-letter / short variable names
    "i", "j", "k", "l", "m", "n", "x", "y", "z", "a", "b", "c", "p", "q",
    "idx", "key", "val", "item", "row", "col", "obj", "res", "err",
    # Common generic method names
    "get", "set", "add", "remove", "push", "pop", "find", "has", "map",
    "filter", "reduce", "foreach", "call", "apply", "bind", "init",
    "create", "update", "delete", "render", "build", "parse", "format",
    # Type annotation names
    "string", "number", "boolean", "object", "array", "any", "unknown",
    "never", "promise", "result", "option", "optional",
    # React / Vue / generic framework noise
    "name", "data", "value", "result", "error", "state",
    "props", "ref", "callback", "handler", "options", "params", "args",
    "children", "component", "node", "elem", "el", "event", "target",
    "style", "classname", "src", "href", "alt", "title",
    "width", "height", "size", "color", "background",
}

ALL_STOP = _ENGLISH_STOP | _CODE_STOP


def filter_stopwords(counter: Counter[str]) -> Counter[str]:
    """Remove all stopwords from a word-frequency counter."""
    return Counter({
        word: count
        for word, count in counter.items()
        if word not in ALL_STOP and len(word) >= 2
    })
