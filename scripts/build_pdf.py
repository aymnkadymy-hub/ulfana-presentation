#!/usr/bin/env python3
"""Render the built _site deck to data/ulfana-presentation.pdf.

Prints the public package, so the PDF can never contain anything the
release checks would block. Run scripts/build_site.py first, then:

    python3 scripts/build_pdf.py

Needs Playwright's Chromium (python3 -m playwright install chromium).
"""
from __future__ import annotations

import functools
import http.server
import pathlib
import socketserver
import threading

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT / '_site'
OUT = ROOT / 'data' / 'ulfana-presentation.pdf'


def main() -> int:
    if not (SITE / 'index.html').is_file():
        print('Run scripts/build_site.py first.')
        return 2
    from playwright.sync_api import sync_playwright

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(SITE))

    class Server(socketserver.TCPServer):
        allow_reuse_address = True

    server = Server(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto(f'http://127.0.0.1:{server.server_address[1]}/index.html',
                      wait_until='networkidle')
            # The print sheet reveals every slide; companions fall back to their
            # static art while printing, so let that settle before capture.
            page.emulate_media(media='print')
            page.wait_for_timeout(1500)
            page.pdf(path=str(OUT), format='A4', landscape=True,
                     print_background=True, prefer_css_page_size=True)
            browser.close()
    finally:
        server.shutdown()
    print(f'Wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size:,} bytes)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
