"""Backend configuration.

Values can be overridden with environment variables (or backend/.env).
The Supabase URL + publishable key are safe to ship to the client by design;
GEMINI_API_KEY must only ever live in the environment.
"""

import os

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_PROJECT_REF = os.getenv("SUPABASE_PROJECT_REF", "pcyiyxlnmqobowdsgmtl")
SUPABASE_URL = os.getenv("SUPABASE_URL", f"https://{SUPABASE_PROJECT_REF}.supabase.co")

# Publishable (anon) key — public by design; replace via env if rotated or if
# you point at a different project. RLS policies on the garments table /
# storage bucket are what actually gate access.
SUPABASE_KEY = os.getenv(
    "SUPABASE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWl5eGxubXFvYm93ZHNnbXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTQ4MjksImV4cCI6MjA5NjA3MDgyOX0.fiHArG4qKHgH8Q0d3Dy0JjytZpezgclm3xWKpRdSfA8",
)

STORAGE_BUCKET = os.getenv("SUPABASE_BUCKET", "garment-images")
GARMENTS_TABLE = "garments"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
GEMINI_TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash")
