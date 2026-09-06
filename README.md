# ROAST.EXE

Neon CRT roast machine built with Next.js + Groq API.

## Features
- Solo roast or two-player roast battle
- Selfie/photo or Spotify evidence
- Five roast personalities + heat dial
- Roast contract before firing
- Dynamic roastability meter
- Vibe archetype + fatality line
- Character-style vibe diagnostics
- Save scan as PNG
- Share/copy result
- Same-evidence rematch
- Local "YOUR CRIMINAL RECORD" history

## Setup

```bash
npm install
```

Create `.env.local`:

```env
# Get your API key at https://console.groq.com/keys
GROQ_API_KEY=gsk_your-groq-api-key

# Optional model configuration
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_VISION_MODEL=llama-3.2-11b-vision-preview
```

Run:

```bash
npm run dev
```

Open the localhost URL printed by Next.js.

The API key stays server-side in `.env.local`; never commit it.
