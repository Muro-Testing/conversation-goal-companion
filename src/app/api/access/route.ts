import { NextResponse } from "next/server";
import { issueSession, verifyAccessPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const configured = process.env.APP_ACCESS_PASSWORD && process.env.APP_SESSION_SECRET;
  if (!configured) {
    return NextResponse.json({ error: "The demo access gate is not configured yet." }, { status: 503 });
  }

  let password = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "password" in body && typeof body.password === "string") {
      password = body.password;
    }
  } catch {
    return NextResponse.json({ error: "Enter the demo password and try again." }, { status: 400 });
  }

  if (!verifyAccessPassword(password)) {
    return NextResponse.json({ error: "That password did not match. Try again." }, { status: 401 });
  }

  try {
    await issueSession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "The demo session could not start." }, { status: 503 });
  }
}
