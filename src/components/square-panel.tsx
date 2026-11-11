"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui";

export function SquarePanel({ configured, environment }: { configured: boolean; environment: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [target, setTarget] = useState(environment === "sandbox" ? "sandbox" : "production");

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch("/api/square/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Square request failed.");
      toast.success(data.message || "Square responded.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Square request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveToken(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/square/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, environment: target }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The token was not saved.");
      setToken("");
      toast.success(data.message || "Square token saved.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The token was not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form className="space-y-3" onSubmit={saveToken}>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Personal access token</span>
          <input
            className="w-full rounded-md border border-line bg-card px-3 py-2"
            type="password"
            autoComplete="off"
            value={token}
            placeholder={configured ? "Token saved. Paste a new one to replace it." : "Paste the token from the Square Developer Console"}
            onChange={(event) => setToken(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Environment</span>
          <select className="w-full rounded-md border border-line bg-card px-3 py-2" value={target} onChange={(event) => setTarget(event.target.value)}>
            <option value="production">Production</option>
            <option value="sandbox">Sandbox</option>
          </select>
        </label>
        <Button disabled={busy || token.trim().length < 20}>Save token on this Mac</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy || !configured} onClick={() => call({ mode: "check" })}>Check connection</Button>
        <Button disabled={busy || !configured} onClick={() => call({ trigger: "manual" })}>Import catalog</Button>
      </div>
    </div>
  );
}
