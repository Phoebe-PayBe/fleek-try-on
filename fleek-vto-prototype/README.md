# Fleek VTO Prototype

Frontend-only prototype for a B2B upcycled clothing marketplace with a Virtual Try-On (VTO) feature. **100% mocked data** — no backend, no live image generation. Placeholder images come from `placehold.co`.

## Run

```bash
npm install
npm run dev      # start dev server (Vite)
npm run build    # typecheck + production build
npm run typecheck
```

Open the dev server URL (default http://localhost:5173).

## Pages

| Route    | Page                    | Notes                                              |
|----------|-------------------------|----------------------------------------------------|
| `/`      | Product Details         | Standard gallery + interactive VTO viewer          |
| `/admin` | Admin Dashboard         | Blank placeholder (teammate: Google Vision workflow)|

## VTO viewer controls

- **Top arrows** → toggle model demographic (Asian → White → Black, cycles).
- **Middle side arrows** → toggle size (S → M → L → XL, cycles).
- Displayed image reflects the **demographic × size** combination.
- **Measurement overlay** (top-right) updates with the selected size.
- **Bottom pill** shows `Size: <Label>`, mirroring the Google Try-On UI.
- A size quick-select row is also provided below the stage.

## Where things live

```
src/
├── types/index.ts              # all shared TS interfaces + label maps
├── mocks/
│   ├── product.ts              # the single mock product
│   └── vtoMatrix.ts            # 3 x 4 = 12 variants (image + measurements)
├── hooks/useVtoSelection.ts    # useReducer-based VTO state (cycling indices)
├── components/
│   ├── StandardGallery/        # 3 standard images + thumbnails
│   ├── VtoViewer/              # stage, controls, overlay, size indicator
│   └── ProductInfoPanel/       # right-hand product info
└── pages/
    ├── ProductDetailsPage/
    └── AdminDashboardPage/     # placeholder
```

## Swapping in real data later

Replace the `placehold.co` URLs in `mocks/vtoMatrix.ts` (`imageFor`) and
`mocks/product.ts` with real image URLs. The admin teammate's Google Vision
output can populate the same `VtoMatrix` shape (`matrix[demographic][size]`).
