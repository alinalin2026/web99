# Web99.ie static website

A complete, mobile-first marketing site built from the supplied Web99.ie brief.

## Deploy to Vercel

1. Put this folder in a Git repository, or upload/import it directly in Vercel.
2. Framework preset: **Other** (Vercel normally detects it as a static site).
3. No build command is needed.
4. No output directory is needed.

You can also test it locally with:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Edit the launch placeholders

Open `script.js`. The first block is `WEB99_CONFIG` and contains:

- WhatsApp number
- Year-two renewal price
- Real customer counter and on/off switch
- Real testimonials and on/off switch

Do not enable the counter or testimonials until real information exists.

## Routes included

- `/`
- `/start/`
- `/how-it-works/`
- `/features/`
- `/pricing/`
- `/faq/`
- `/contact/`
- `/terms/`
- `/privacy/`

## Before taking payments or leads

- Add the real WhatsApp number.
- Confirm the year-two renewal figure.
- Replace the legal placeholders in Terms and Privacy.
- Connect the form/chat on `/start/` to the chosen backend or chat service.
- The included hero image is a free Unsplash photo by André Reis. Replace it with an owned photo of a real Irish customer before the final campaign for stronger local authenticity.
