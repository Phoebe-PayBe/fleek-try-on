# fleek-try-on

AI models for Fleek Upcycled Inventory — virtual try-on for wholesale vintage & upcycled fashion.

## Structure

| Path | What | Owner |
| --- | --- | --- |
| `fleek-vto-prototype/` | React app. Buyer product page at `/`, **Supplier Studio (admin) at `/admin`** | Jamie (buyer) / Phoebe (supplier) |
| `fleek-vto-prototype/src/supplier/` | Supplier Studio: template scanner, item upload, AI try-on studio, buyer summary, publish | Phoebe |
| `backend/` | Python FastAPI: Supabase catalogue + image storage, Gemini try-on & summary generation | Phoebe |
| `materials/` | Sample scanned clothing template | — |

## Run it locally

Terminal 1 — backend (Python 3.11+):

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Terminal 2 — frontend:

```bash
cd fleek-vto-prototype
npm install
npm run dev
```

Open <http://localhost:5173/admin> for the Supplier Studio (buyer page is at `/`).
Any login credentials work — it's a hackathon demo.

## Supplier Studio flow

1. **Scan template** — photograph the large paper clothing template on your phone
   (camera opens directly on mobile); "Enhance scan" flattens lighting and sharpens
   pattern lines like a document scanner.
2. **Photograph item** — flat-lay photo of the finished upcycled piece.
3. **Details** — fabric composition, the upcycled fabric-scraps story, wholesale price, quantity.
4. **Try-on studio** — pick the model's demographics (ethnicity, gender, height, weight)
   and generate the try-on render. Generate the AI buyer summary (how the garment feels +
   style notes + retail merchandising angle), then **Publish to marketplace**.

## AI configuration

Set `GEMINI_API_KEY` in `backend/.env` (see `backend/.env.example`) to enable real
Google Gemini try-on renders (`gemini-2.5-flash-image`) and buyer summaries
(`gemini-2.5-flash`). **Without a key everything still works**: try-ons use a built-in
demographic-aware demo renderer and summaries fall back to a rule-based generator.

A Gemini key pasted into the studio UI is used for in-browser generation when the
backend has no key.

## Data

- Catalogue: Supabase table `garments` (project `pcyiyxlnmqobowdsgmtl` by default —
  override with `SUPABASE_PROJECT_REF` / `SUPABASE_KEY` env vars).
- Images: Supabase storage bucket `garment-images` (public).
- If the backend is down the frontend automatically switches to a browser-local
  (IndexedDB) offline mode so demos never stall.
