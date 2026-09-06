import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY missing from environment." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { originalRoast = "", userExcuse = "", personality = "group-chat" } = body;

  if (!userExcuse.trim()) {
    return NextResponse.json(
      { error: "Silence is not a defense. Type an excuse." },
      { status: 400 }
    );
  }

  const systemPrompt = `You are ROAST.EXE, an entertainment roast engine.
The user just received a roast and is attempting to clap back or offer an excuse.
Destroy their excuse with ONE devastating, funny punchline under 16 words.
Address the excuse directly.
Keep internet-native humor, dry wit, or deadpan reality check.
Never attack protected traits or physical appearance.
Output ONLY raw JSON with no markdown:
{"rebuttal":"..."}`;

  const userPrompt = `ORIGINAL ROAST:
"${String(originalRoast).slice(0, 300)}"

USER'S EXCUSE/DEFENSE:
"${String(userExcuse).slice(0, 300)}"

Shut down this excuse:`;

  const model = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Clapback Groq error:", res.status, errText);
      return NextResponse.json(
        { rebuttal: "That excuse is so weak even the server refused to process it." },
        { status: 200 }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const rebuttal =
      parsed?.rebuttal ||
      "Nice try. The algorithm has logged your defense under 'pure delusion.'";

    return NextResponse.json({ rebuttal });
  } catch (e) {
    console.error("Clapback error:", e);
    return NextResponse.json(
      { rebuttal: "Denial recorded. Your dignity balance remains zero." },
      { status: 200 }
    );
  }
}
