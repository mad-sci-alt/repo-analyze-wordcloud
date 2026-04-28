import base64
import io
from collections import Counter

import numpy as np
from PIL import Image
from wordcloud import WordCloud


def create_circular_mask(size: int = 800) -> np.ndarray:
    """Generate a square array with 1s inside a circle, 0s outside."""
    x = np.linspace(-1, 1, size)
    yy, xx = np.meshgrid(x, x)
    radius = np.sqrt(xx**2 + yy**2)
    return (radius <= 1.0).astype(np.uint8)


def generate_wordcloud(
    frequency_stats: Counter[str],
    top_n: int = 20,
    size: int = 800,
) -> str:
    """
    Generate a circular word cloud image and return it as a base64 PNG data URL.
    """
    top_words = dict(frequency_stats.most_common(top_n))

    if not top_words:
        raise ValueError("No words to visualize after filtering")

    mask = create_circular_mask(size)

    wc = WordCloud(
        width=size,
        height=size,
        mask=mask,
        background_color="white",
        max_words=top_n,
        colormap="viridis",
        prefer_horizontal=0.8,
        min_font_size=10,
        max_font_size=150,
        relative_scaling=0.5,
    )
    wc.generate_from_frequencies(top_words)

    img = wc.to_image()
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    return f"data:image/png;base64,{b64}"
