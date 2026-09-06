import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const PERSONALITY_VOICE = {
  "group-chat":
    "Voice: the group chat. Internet-native, casual, specific, fast punchlines.",
  mentor:
    "Voice: a mentor who expected better. Dry, understated, disappointed.",
  hr:
    "Voice: deadpan corporate HR. Treat choices like performance-review line items.",
  ex:
    "Voice: an ex who remembers everything. Petty, specific, uncomfortably precise.",
  closer:
    "Voice: a stand-up closer. Strong one-liners that build toward a final punchline.",
};

const HEAT_GUIDANCE = {
  1: "Heat 1/5 — playful teasing.",
  2: "Heat 2/5 — pointed but friendly.",
  3: "Heat 3/5 — savage and clever.",
  4: "Heat 4/5 — scorched and ruthless about the material.",
  5: "Heat 5/5 — maximum comedic intensity, still playful and safe.",
};

const MODE_GUIDANCE = {
  selfie:
    "Photo input: roast the scene, choices, objects, text, setting, camera setup, and context. Never roast physical appearance.",
  spotify:
    "Spotify input: only use data actually visible in screenshots or supplied text. Never invent artists, numbers, rankings, or genres.",
};

const SYSTEM_PROMPT = `You are ROAST.EXE, an entertainment roast engine.

Turn supplied evidence into short, genuinely funny, highly specific punchlines.

SAFETY:
- Roast choices, habits, content, decisions, and observable context.
- Never roast body, physical appearance, race, ethnicity, gender, disability, age, religion, sexual orientation, or protected/identity traits.
- For photos, never judge a person's face, body, attractiveness, weight, or physical traits. Roast the scene and choices instead.
- No slurs, hate speech, self-harm encouragement, or attacks on fundamental worth.
- If evidence is insufficient, roast the lack of evidence instead of inventing facts.

COMEDY:
- Specific beats generic.
- Find contradictions, patterns, questionable decisions, and absurd details.
- Every roast line must be ONE punchline and under 14 words.
- No paragraphs. No setup-heavy explanations.
- Make the user laugh because the line is clever, not because it is merely cruel.
- Use previous roast material for callbacks when it actually helps.
- Use contemporary Gen-Z internet humor naturally: deadpan, absurdly specific, meme-adjacent, but do not force slang into every line.
- Make the diagnostics feel like a personalized "character stats" screen, not a generic wellness report.
- Pick diagnostic categories that are RELEVANT TO THE INPUT:
  * SELFIE/PHOTO: Caffeine Level, Sleep Schedule, Chaos Level, Main Character Energy, Productivity Theater, Social Battery, Touch-Grass Deficit, Academic Survival, Financial Damage, Chronically Online.
  * SPOTIFY: Emotional Damage, Music Taste Crimes, Main Character Energy, Delulu Index, Breakup Potential, Nostalgia Addiction, NPC Resistance, Concert Delusion, Chronically Online, Financial Damage.
  * DUO: choose different or contrasting categories for each player when the evidence supports it, so the battle feels personalized.
- Never blindly use the same four categories every time. Select the funniest four supported by the evidence.
- Labels should be short and Gen-Z-readable: examples include "IV drip energy", "government classified", "respectfully delusional", "one email from collapse", "financially cooked", "playlist has lore", "touch grass pending", "NPC immunity", "emotionally sponsored by Spotify".
- Vibe diagnostics are COMEDIC ESTIMATES, not real measurements. Never claim to medically diagnose sleep deprivation, addiction, mental illness, or any health condition.

SOLO:
- Exactly 5 short roast lines.
- Score the quality/amount of comedic ammunition from 0-100.
- Give a 2-4 word verdict.
- Give one short summary for future callbacks.
- Also return exactly 4 funny vibe diagnostics for the user. Use relatable categories such as Caffeine Level, Sleep Schedule, Delulu Index, Academic Survival, Chronically Online, Social Battery, Main Character Energy, Financial Damage, Emotional Damage, or Chaos Level.
- Each diagnostic has a category, 0-100 score, and 1-4 word label.
- These are comedic estimates, not factual measurements or health claims.

DUO:
- Treat Player 01 and Player 02 as rivals.
- Exactly 6 short lines.
- Compare the two players directly in several lines.
- The final line should feel like a decisive closing punchline.
- Pick the winner based on who supplied more roastable evidence.
- Winner must be PLAYER 01, PLAYER 02, or DRAW.
- Never judge physical attractiveness or protected traits.

VIBE STATS:
- Also return exactly 4 funny "vibe diagnostics" for each player.
- Good categories include Caffeine Level, Sleep Schedule, Delulu Index, Academic Survival, Chronically Online, Social Battery, Main Character Energy, Financial Damage, Emotional Damage, or Chaos Level.
- Use a 0-100 score and a short label of 1-4 words.
- These are comedic estimates based only on the supplied evidence. They are NOT factual health measurements.
- In DUO, return separate stats for Player 01 and Player 02.

Return ONLY raw JSON.`;

function extractBalancedJson(text) {
  const source = String(text || "");
  const start = source.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }

  return null;
}

function sanitizeJsonCandidate(raw) {
  return String(raw || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function safeParseJson(raw) {
  const cleaned = sanitizeJsonCandidate(raw);
  const candidate = extractBalancedJson(cleaned) || cleaned;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

async function readImage(file) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size <= 0) {
    return null;
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image is too large (maximum 8MB).");
  }

  const mediaType = file.type || "image/jpeg";
  if (!SUPPORTED_IMAGE_TYPES.includes(mediaType)) {
    throw new Error("Unsupported image format. Use JPG, PNG, GIF, or WEBP.");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  return { mediaType, base64: buf.toString("base64") };
}


function normalizeVibeStats(stats) {
  if (!Array.isArray(stats)) return [];

  return stats
    .filter((item) => item && typeof item === "object")
    .slice(0, 4)
    .map((item) => ({
      category:
        typeof item.category === "string"
          ? item.category.slice(0, 28)
          : "CHAOS LEVEL",
      score: Math.min(
        100,
        Math.max(0, Math.round(Number(item.score) || 0))
      ),
      label:
        typeof item.label === "string"
          ? item.label.slice(0, 32)
          : "Highly suspicious",
    }));
}

function normalizeCharacterSheet(sheet) {
  if (!sheet || typeof sheet !== "object") {
    return {
      equippedArmor: "Fleece Vest of Corporate Neutrality (-10 Charisma)",
      equippedWeapon: "Unsolicited Podcast Recommendation (+0 Damage)",
      activeDebuff: "Chronically Online (Perception -40, Sleep: Critical)",
      specialAbility: "Can turn any conversation into a complaint about rent",
    };
  }
  return {
    equippedArmor: String(sheet.equippedArmor || "Basic Cotton Armor of Denial (-5 DEF)").slice(0, 80),
    equippedWeapon: String(sheet.equippedWeapon || "Unsolicited Hot Take (+0 DMG)").slice(0, 80),
    activeDebuff: String(sheet.activeDebuff || "Chronically Online (Dignity -30)").slice(0, 80),
    specialAbility: String(sheet.specialAbility || "Can stare at Spotify for 40 minutes without picking a song").slice(0, 90),
  };
}

function normalizeCelebrityTwin(twin) {
  if (!twin || typeof twin !== "object") {
    return {
      name: "Kendall Roy",
      comparison: "Radiates the chaotic energy of someone rehearsing a pitch deck in an organic smoothie line.",
    };
  }
  return {
    name: String(twin.name || "A background character in Succession").slice(0, 45),
    comparison: String(twin.comparison || "If intense ambition had absolutely zero tactical coordination.").slice(0, 160),
  };
}

function normalizePhotoAnnotations(annotations) {
  if (!Array.isArray(annotations)) return [];
  return annotations
    .filter((a) => a && typeof a === "object")
    .slice(0, 4)
    .map((a, i) => ({
      id: i + 1,
      x: Math.min(85, Math.max(15, Math.round(Number(a.x) || (22 + i * 20)))),
      y: Math.min(85, Math.max(15, Math.round(Number(a.y) || (24 + i * 18)))),
      title: String(a.title || `CRIME PIN #${i + 1}`).slice(0, 30).toUpperCase(),
      comment: String(a.comment || "Questionable life choices detected in this sector.").slice(0, 95),
    }));
}

async function callGroq({
  apiKey,
  model,
  systemPrompt,
  userText,
  imageBlock,
  imageBlock2,
  jsonMode = false,
}) {
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  const hasImages = Boolean(imageBlock || imageBlock2);

  if (hasImages) {
    const content = [{ type: "text", text: userText }];

    if (imageBlock) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${imageBlock.mediaType};base64,${imageBlock.base64}`,
        },
      });
    }

    if (imageBlock2) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${imageBlock2.mediaType};base64,${imageBlock2.base64}`,
        },
      });
    }

    messages.push({
      role: "user",
      content,
    });
  } else {
    messages.push({
      role: "user",
      content: userText,
    });
  }

  const requestBody = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 750,
  };

  if (jsonMode) {
    requestBody.response_format = { type: "json_object" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    return await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function repairRoastJson({ apiKey, rawText, userMode }) {
  const expected = userMode === "duo"
    ? `{"lines":["..."],"score":0,"verdict":"...","summary":"...","archetype":"...","archetypeReason":"...","fatality":"...","winner":"PLAYER 01","vibeStats":[{"category":"...","score":0,"label":"..."}],"friendVibeStats":[{"category":"...","score":0,"label":"..."}]}`
    : `{"lines":["..."],"score":0,"verdict":"...","summary":"...","archetype":"...","archetypeReason":"...","fatality":"...","vibeStats":[{"category":"...","score":0,"label":"..."}]}`;

  const repairPrompt = `You are a JSON formatter. Convert the following model output into VALID JSON only. Preserve the roast wording as much as possible. Do not add commentary. Required shape: ${expected}\n\nMODEL OUTPUT:\n${String(rawText).slice(0, 12000)}`;

  const repairModel = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

  const response = await callGroq({
    apiKey,
    model: repairModel,
    systemPrompt: "Return valid JSON only. Never use markdown fences.",
    userText: repairPrompt,
    imageBlock: null,
    imageBlock2: null,
    jsonMode: false,
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return safeParseJson(text);
}

export async function POST(req) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "SERVER ERROR: GROQ_API_KEY is missing. Add it to .env.local and restart the dev server.",
      },
      { status: 500 }
    );
  }

  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "SYSTEM ERROR: could not read the request." },
      { status: 400 }
    );
  }

  const mode = String(form.get("mode") || "selfie");
  const userMode = String(form.get("userMode") || "solo");
  const text = String(form.get("text") || "").slice(0, 2000);
  const text2 = String(form.get("text2") || "").slice(0, 2000);
  const playerName = String(form.get("playerName") || "PLAYER 01")
    .replace(/[<>]/g, "")
    .slice(0, 24);
  const friendName = String(form.get("friendName") || "PLAYER 02")
    .replace(/[<>]/g, "")
    .slice(0, 24);
  const personality = String(form.get("personality") || "group-chat");

  const parsedHeat = Number.parseInt(String(form.get("heat") || "3"), 10);
  const heat = Number.isFinite(parsedHeat)
    ? Math.min(5, Math.max(1, parsedHeat))
    : 3;

  let history = [];
  try {
    const parsed = JSON.parse(String(form.get("history") || "[]"));
    history = Array.isArray(parsed) ? parsed : [];
  } catch {
    history = [];
  }

  let imageBlock = null;
  let imageBlock2 = null;

  try {
    imageBlock = await readImage(form.get("image"));
    imageBlock2 = await readImage(form.get("image2"));
  } catch (e) {
    return NextResponse.json({ error: `SYSTEM: ${e.message}` }, { status: 400 });
  }

  const hasPrimary = Boolean(imageBlock || text.trim());
  const hasSecondary = Boolean(imageBlock2 || text2.trim());

  if (!hasPrimary) {
    return NextResponse.json(
      { error: "SYSTEM: Player 01 has provided no evidence." },
      { status: 400 }
    );
  }

  if (userMode === "duo" && !hasSecondary) {
    return NextResponse.json(
      { error: "SYSTEM: Player 02 has provided no evidence." },
      { status: 400 }
    );
  }

  const historyBlock =
    history.length > 0
      ? `

Previous roast callbacks:
- ${history.slice(-6).join("\n- ")}`
      : "";

  const userText =
    userMode === "duo"
      ? `${PERSONALITY_VOICE[personality] || PERSONALITY_VOICE["group-chat"]}
${HEAT_GUIDANCE[heat]}
${MODE_GUIDANCE[mode] || MODE_GUIDANCE.selfie}

MODE: ROAST BATTLE

PLAYER 01 NAME: ${playerName}
PLAYER 01 EVIDENCE:
${text.trim() || "(image supplied; inspect it)"}

PLAYER 02 NAME: ${friendName}
PLAYER 02 EVIDENCE:
${text2.trim() || "(image supplied; inspect it)"}

${historyBlock}

Output exactly:
{"lines":["line 1","line 2","line 3","line 4","line 5","line 6"],"score":0,"verdict":"2-4 words","summary":"one short sentence","archetype":"THE ...","archetypeReason":"one short sentence","fatality":"one killer punchline","winner":"PLAYER 01","celebrityTwin":{"name":"Kendall Roy","comparison":"one funny comparison sentence"},"characterSheet":{"equippedArmor":"humorous armor label with (-stat)","equippedWeapon":"humorous weapon (+0 damage)","activeDebuff":"funny active curse","specialAbility":"funny useless ability"},"photoAnnotations":[{"x":35,"y":40,"title":"SCENE AUDIT","comment":"brief forensic insult under 12 words"}],"vibeStats":[{"category":"Caffeine Level","score":0,"label":"..."}],"friendVibeStats":[{"category":"Caffeine Level","score":0,"label":"..."}]}

winner must be PLAYER 01, PLAYER 02, or DRAW.
archetype should be a memorable 2-5 word comedic identity label, not a protected trait.
archetypeReason explains the label from evidence in one short sentence.
fatality is the strongest closing punchline and must be under 16 words.
vibeStats and friendVibeStats must each contain exactly 4 diagnostics.
photoAnnotations should have 2-4 visual crime pins with percentage x/y coordinates (15-85) if photo evidence is present.
Use names inside the punchlines when useful.
Keep every line under 14 words.
Make line 6 the closing punchline.
Raw JSON only.`
      : `${PERSONALITY_VOICE[personality] || PERSONALITY_VOICE["group-chat"]}
${HEAT_GUIDANCE[heat]}
${MODE_GUIDANCE[mode] || MODE_GUIDANCE.selfie}

MODE: SOLO

PLAYER 01 NAME: ${playerName}
PLAYER 01 EVIDENCE:
${text.trim() || "(image supplied; inspect it)"}

${historyBlock}

Output exactly:
{"lines":["line 1","line 2","line 3","line 4","line 5"],"score":0,"verdict":"2-4 words","summary":"one short sentence","archetype":"THE ...","archetypeReason":"one short sentence","fatality":"one killer punchline","celebrityTwin":{"name":"Celebrity or Fictional Character","comparison":"one funny comparison sentence"},"characterSheet":{"equippedArmor":"humorous armor label with (-stat)","equippedWeapon":"humorous weapon (+0 damage)","activeDebuff":"funny active curse","specialAbility":"funny useless ability"},"photoAnnotations":[{"x":35,"y":40,"title":"SCENE AUDIT","comment":"brief forensic insult under 12 words"}],"vibeStats":[{"category":"Caffeine Level","score":0,"label":"..."}]}

vibeStats must contain exactly 4 diagnostics.
archetype should be a memorable 2-5 word comedic identity label, not a protected trait.
archetypeReason explains the label from evidence in one short sentence.
fatality is the strongest closing punchline and must be under 16 words.
photoAnnotations should have 2-4 visual crime pins with percentage x/y coordinates (15-85) if photo evidence is present.
Keep every line under 14 words.
Make line 5 the closing punchline.
Choose four vibe diagnostics that are specific to this input type and evidence.
For Spotify, prioritize music-personality diagnostics; for selfies, prioritize scene/behavior/chaos diagnostics.
Raw JSON only.`;

  const hasImages = Boolean(imageBlock || imageBlock2);
  const defaultTextModel = "qwen/qwen3.8-27b";
  const defaultVisionModel = "qwen/qwen3.8-27b";

  const model = hasImages
    ? (process.env.GROQ_VISION_MODEL || process.env.GROQ_MODEL || defaultVisionModel)
    : (process.env.GROQ_MODEL || defaultTextModel);
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let response = await callGroq({
        apiKey,
        model,
        systemPrompt: SYSTEM_PROMPT,
        userText,
        imageBlock,
        imageBlock2,
        jsonMode: false,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Groq API error:", response.status, errorBody);

        let detail = "";
        try {
          detail = JSON.parse(errorBody)?.error?.message || "";
        } catch {}

        lastError = detail
          ? `Groq ${response.status}: ${detail}`
          : `Groq API returned HTTP ${response.status}`;

        if (response.status === 429 || response.status >= 500) continue;
        break;
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const rawText = choice?.message?.content || "";

      if (!rawText) {
        lastError = `Groq returned no text (${choice?.finish_reason || "unknown reason"})`;
        continue;
      }

      let parsed = safeParseJson(rawText);

      if (!parsed || !Array.isArray(parsed.lines) || parsed.lines.length === 0) {
        parsed = await repairRoastJson({ apiKey, rawText, userMode });
      }

      if (!parsed || !Array.isArray(parsed.lines) || parsed.lines.length === 0) {
        lastError = "Groq returned invalid roast JSON";
        continue;
      }

      const maxLines = userMode === "duo" ? 6 : 5;
      const lines = parsed.lines
        .filter((line) => typeof line === "string" && line.trim())
        .map((line) => line.trim())
        .slice(0, maxLines);

      if (!lines.length) {
        lastError = "Groq returned an empty roast";
        continue;
      }

      return NextResponse.json({
        lines,
        score: Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 50))),
        verdict:
          typeof parsed.verdict === "string"
            ? parsed.verdict.slice(0, 60)
            : "UNDER REVIEW",
        summary:
          typeof parsed.summary === "string"
            ? parsed.summary.slice(0, 180)
            : "The evidence was suspiciously roastable.",
        archetype:
          typeof parsed.archetype === "string"
            ? parsed.archetype.slice(0, 50)
            : "THE UNFORTUNATE MAIN CHARACTER",
        archetypeReason:
          typeof parsed.archetypeReason === "string"
            ? parsed.archetypeReason.slice(0, 140)
            : "The evidence suggests several highly questionable decisions.",
        fatality:
          typeof parsed.fatality === "string"
            ? parsed.fatality.slice(0, 180)
            : lines[lines.length - 1],
        winner:
          userMode === "duo" &&
          ["PLAYER 01", "PLAYER 02", "DRAW"].includes(parsed.winner)
            ? parsed.winner
            : undefined,
        vibeStats: normalizeVibeStats(parsed.vibeStats),
        friendVibeStats:
          userMode === "duo" ? normalizeVibeStats(parsed.friendVibeStats) : undefined,
        celebrityTwin: normalizeCelebrityTwin(parsed.celebrityTwin),
        characterSheet: normalizeCharacterSheet(parsed.characterSheet),
        photoAnnotations: normalizePhotoAnnotations(parsed.photoAnnotations),
      });
    } catch (e) {
      console.error("Roast request failed:", e);
      lastError =
        e?.name === "AbortError"
          ? "Groq request timed out"
          : e?.message || "Unknown server error";
    }
  }

  const isDev = process.env.NODE_ENV !== "production";

  return NextResponse.json(
    {
      error: isDev
        ? `SYSTEM ERROR: Groq could not generate the roast. ${lastError || ""}`.trim()
        : "SYSTEM ERROR: the roast machine choked. Try again in a moment.",
    },
    { status: 502 }
  );
}
