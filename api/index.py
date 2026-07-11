"""Vercel serverless entrypoint — exposes the FastAPI backend at /api/*.

Set GEMINI_API_KEY in the Vercel project's environment variables to enable
real AI try-on renders in production; without it the app runs in demo mode.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app  # noqa: E402,F401
