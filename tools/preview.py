#!/usr/bin/env python3
"""Development preview server for Qevora AI SaaS UI.

    python3 tools/preview.py          # http://localhost:8080
    python3 tools/preview.py 9000

It is the same static file server as `python3 -m http.server`, with one
difference that matters while the template is being worked on: every response
carries `Cache-Control: no-store`, so a browser can never show an older copy of
`assets/css/*` or `assets/js/*` than the one on disk. GitHub Pages serves the
same files with a ten minute cache, which is long enough to make a fresh fix
look missing.

This file is a development tool. It is not part of the buyer package: the
release ZIP ships only the template itself (see tools/package.sh).
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        """One quiet line per request is enough for a preview."""
        sys.stderr.write("preview: " + (fmt % args) + "\n")


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    server = ThreadingHTTPServer(("0.0.0.0", port), NoCacheHandler)
    print(f"Qevora preview on http://localhost:{port} (no-store, serving the repo root)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nQevora preview stopped.")


if __name__ == "__main__":
    main()
