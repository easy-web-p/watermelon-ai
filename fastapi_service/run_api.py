"""Entry point for the local vision service.

Bind through VISION_HOST / VISION_PORT. Without an explicit port, match the
local VISION_SERVICE_URL used by Node, including the value in the root .env.
The default host stays on 127.0.0.1 because this service has no authentication.
"""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlsplit

import uvicorn


def configured_port() -> int:
    explicit = os.getenv("VISION_PORT")
    if explicit:
        return int(explicit)

    service_url = os.getenv("VISION_SERVICE_URL", "")
    if not service_url:
        env_file = Path(__file__).resolve().parent.parent / ".env"
        if env_file.is_file():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                if line.strip().startswith("VISION_SERVICE_URL="):
                    service_url = line.partition("=")[2].strip().strip('"\'')
                    break

    parsed = urlsplit(service_url)
    if parsed.hostname in {"127.0.0.1", "localhost"} and parsed.port:
        return parsed.port
    return 8000

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("VISION_HOST", "127.0.0.1"),
        port=configured_port(),
        reload=os.getenv("VISION_RELOAD") == "true",
    )
