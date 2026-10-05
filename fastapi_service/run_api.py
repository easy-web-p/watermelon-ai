"""Entry point for the vision service.

Bind host and port through VISION_HOST / VISION_PORT. The default stays on
127.0.0.1 because this service has no authentication of its own: the Node API
in server.ts is the only intended caller, and exposing it publicly would let
anyone spend GPU time on it.
"""

from __future__ import annotations

import os

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("VISION_HOST", "127.0.0.1"),
        port=int(os.getenv("VISION_PORT", "8000")),
        reload=os.getenv("VISION_RELOAD") == "true",
    )
