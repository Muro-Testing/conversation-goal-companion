import { AccessGate } from "@/components/AccessGate";
import { ChatShell } from "@/components/ChatShell";
import { hasValidSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const signedIn = await hasValidSession();
  return signedIn ? <ChatShell /> : <AccessGate />;
}
