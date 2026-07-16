#!/usr/bin/env python3

import base64
import json
import time
from pathlib import Path
from urllib.parse import quote

import requests
import websocket


ROOT = Path(__file__).resolve().parent.parent
CDP_HTTP = "http://localhost:29229"
WIDTH = 1672
HEIGHT = 941


class Cdp:
    def __init__(self, socket_url: str):
        self.socket = websocket.create_connection(
            socket_url,
            timeout=30,
            origin=CDP_HTTP,
            suppress_origin=True,
        )
        self.next_id = 1

    def call(self, method: str, params=None):
        request_id = self.next_id
        self.next_id += 1
        self.socket.send(
            json.dumps(
                {
                    "id": request_id,
                    "method": method,
                    "params": params or {},
                }
            )
        )
        while True:
            response = json.loads(self.socket.recv())
            if response.get("id") == request_id:
                if "error" in response:
                    raise RuntimeError(f"{method}: {response['error']}")
                return response.get("result", {})

    def close(self):
        self.socket.close()


def render(svg_path: Path):
    file_url = svg_path.as_uri()
    target = requests.put(f"{CDP_HTTP}/json/new?{quote(file_url, safe=':/')}").json()
    cdp = Cdp(target["webSocketDebuggerUrl"])
    try:
        cdp.call("Page.enable")
        cdp.call(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": WIDTH,
                "height": HEIGHT,
                "deviceScaleFactor": 1,
                "mobile": False,
            },
        )
        cdp.call("Page.navigate", {"url": file_url})
        time.sleep(0.25)
        cdp.call(
            "Runtime.evaluate",
            {
                "expression": "document.fonts ? document.fonts.ready.then(() => true) : true",
                "awaitPromise": True,
                "returnByValue": True,
            },
        )
        screenshot = cdp.call(
            "Page.captureScreenshot",
            {
                "format": "png",
                "fromSurface": True,
                "captureBeyondViewport": False,
            },
        )
        png_path = svg_path.with_suffix(".png")
        png_path.write_bytes(base64.b64decode(screenshot["data"]))
        print(f"rendered {png_path.relative_to(ROOT)}")
    finally:
        cdp.close()
        requests.get(f"{CDP_HTTP}/json/close/{target['id']}")


def main():
    for svg_path in sorted(ROOT.glob("00_设计系统/概念图/*.svg")):
        render(svg_path)
    for section in ("01_AI_Cursor", "02_Agentic_Web"):
        for svg_path in sorted((ROOT / section).rglob("*.svg")):
            render(svg_path)


if __name__ == "__main__":
    main()
