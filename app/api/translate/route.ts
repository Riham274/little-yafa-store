import { NextRequest, NextResponse } from "next/server";

type TranslateRequestBody = {
  texts?: unknown;
  target?: unknown;
};

const SUPPORTED_TARGETS = new Set(["en", "he"]);

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Translation is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as TranslateRequestBody | null;
  const texts = Array.isArray(body?.texts) ? body.texts.filter((t): t is string => typeof t === "string" && t.trim() !== "") : [];
  const target = typeof body?.target === "string" ? body.target : "";

  if (texts.length === 0 || !SUPPORTED_TARGETS.has(target)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const form = new URLSearchParams();
  texts.forEach((text) => form.append("q", text));
  form.set("target", target);
  form.set("source", "ar");
  form.set("format", "text");

  try {
    const googleRes = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    if (!googleRes.ok) {
      return NextResponse.json({ error: "Translation request failed." }, { status: 502 });
    }

    const data = await googleRes.json();
    const translations: string[] = (data?.data?.translations ?? []).map(
      (t: { translatedText: string }) => t.translatedText
    );

    return NextResponse.json({ translations });
  } catch {
    return NextResponse.json({ error: "Translation request failed." }, { status: 502 });
  }
}
