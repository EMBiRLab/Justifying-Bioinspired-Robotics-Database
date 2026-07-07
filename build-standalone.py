#!/usr/bin/env python3
"""Bundle the multi-file atlas into one self-contained standalone.html.

The multi-file version (index.html + styles.css + js/*.js) is the source of
truth and the one to deploy to GitHub Pages. standalone.html is a generated
single-file build with everything inlined — it opens reliably by double-click
(file://) and is the file to paste into a Squarespace code block, because it
loads no external resources.

Run from the atlas/ directory:  python3 build-standalone.py
"""
import re

JS_FILES = ["js/data.js", "js/store.js", "js/doi.js", "js/plot.js", "js/app.js"]


def main():
    html = open("index.html", encoding="utf-8").read()
    css = open("styles.css", encoding="utf-8").read()

    # Drop the Supabase-only scripts — standalone.html is the offline local build.
    html = re.sub(
        r"<!-- SUPABASE:START.*?SUPABASE:END -->",
        "",
        html,
        flags=re.DOTALL,
    )

    # Match tags with an optional ?v=... cache-busting query. Callable (lambda)
    # replacements are used so backslashes in the inlined JS/CSS (regex escapes
    # like \s, \d) aren't interpreted as re.sub replacement escapes.
    html = re.sub(
        r'<link rel="stylesheet" href="styles\.css(?:\?[^"]*)?" />',
        lambda m: "<style>\n" + css + "\n</style>",
        html, count=1,
    )

    for jf in JS_FILES:
        code = open(jf, encoding="utf-8").read()
        code = code.replace("</script>", "<\\/script>")  # never break the block
        html = re.sub(
            r'<script src="' + re.escape(jf) + r'(?:\?[^"]*)?"></script>',
            lambda m, c=code: "<script>\n" + c + "\n</script>",
            html, count=1,
        )

    open("standalone.html", "w", encoding="utf-8").write(html)

    assert 'rel="stylesheet"' not in html, "stylesheet not inlined"
    assert "<script src=" not in html, "a script was not inlined"
    print("Wrote standalone.html (%d bytes)" % len(html))


if __name__ == "__main__":
    main()
