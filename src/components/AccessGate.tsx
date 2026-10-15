"use client";

import { FormEvent, useState } from "react";
import { LockIcon, SparkIcon } from "@/components/Icons";

export function AccessGate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The demo could not be opened. Try again.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Could not reach the app. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="gate-screen">
      <div className="gate-glow gate-glow-one" />
      <div className="gate-glow gate-glow-two" />
      <section className="gate-card" aria-labelledby="gate-title">
        <div className="brand-mark"><SparkIcon /></div>
        <p className="eyebrow">A quieter place to think</p>
        <h1 id="gate-title">Make room for your next step.</h1>
        <p className="gate-copy">A private preview for turning everyday conversations into a plan you can see.</p>
        <form className="gate-form" onSubmit={submit}>
          <label htmlFor="demo-password">Preview password</label>
          <div className="password-wrap">
            <LockIcon />
            <input
              id="demo-password"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              autoFocus
            />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button gate-submit" type="submit" disabled={busy || !password}>
            {busy ? "Opening your space…" : "Enter your space"}
            <span aria-hidden="true">↗</span>
          </button>
        </form>
        <div className="gate-footnote"><LockIcon /><span>Your conversations stay in this browser.</span></div>
      </section>
      <p className="gate-bottom">A little clarity can change what comes next.</p>
    </main>
  );
}
