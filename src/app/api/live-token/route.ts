import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { hasValidSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "Open the preview again to continue." }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Voice is not configured yet." }, { status: 503 });

  try {
    const client = new GoogleGenAI({ apiKey });
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: "gemini-3.8-live",
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
      },
    });
    if (!token.name) {
      return NextResponse.json({ error: "Gemini could not start voice right now. Try again or use chat." }, { status: 502 });
    }
    return NextResponse.json({ token: token.name }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Gemini could not connect. Check the internet connection and try again." }, { status: 502 });
  }
}
