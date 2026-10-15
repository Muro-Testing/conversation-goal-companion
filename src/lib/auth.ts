import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "goal_companion_session";
const SESSION_SECONDS = 60 * 60 * 12;

function signature(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("base64url");
}

function matchesSecret(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

export function verifyAccessPassword(candidate: string): boolean {
  const expected = process.env.APP_ACCESS_PASSWORD;
  return Boolean(expected && candidate.length <= 256 && matchesSecret(candidate, expected));
}

export async function issueSession(): Promise<void> {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("APP_SESSION_SECRET must be at least 32 characters.");
  const token = randomBytes(32).toString("base64url");
  const value = `${token}.${signature(token, secret)}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function hasValidSession(): Promise<boolean> {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32) return false;
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return false;
  const [token, suppliedSignature, extra] = value.split(".");
  if (!token || !suppliedSignature || extra) return false;
  return matchesSecret(suppliedSignature, signature(token, secret));
}
