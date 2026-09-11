#!/usr/bin/env python3
"""
Tiny static dev server for Cheetah Reader.

Plain `python -m http.server` sends only Last-Modified, and browsers then
apply heuristic caching - so edits to CSS/JS often don't show up without a
hard refresh. This server sends no-cache headers so a normal reload is
always fresh.

Usage:  python3 scripts/dev-server.py [port]   (default 4173)
"""
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), NoCacheHandler) as httpd:
    print(f"Cheetah Reader dev server → http://localhost:{PORT}")
    httpd.serve_forever()
