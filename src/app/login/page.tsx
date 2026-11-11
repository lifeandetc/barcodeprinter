"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="w-full max-w-sm space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Sign-in failed.");
          return;
        }
        router.push(params.get("next") || "/");
        router.refresh();
      }}
    >
      <div className="font-display text-5xl">Life & Etc.</div>
      <p className="text-sm leading-6 text-muted">This workspace is for the studio. The Square token never comes to the browser.</p>
      <input className="h-11 w-full rounded-md border border-line bg-card px-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button className="h-11 w-full rounded-md bg-ink text-sm text-background">Enter</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
