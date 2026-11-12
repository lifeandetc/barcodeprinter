#!/usr/bin/env node
/**
 * Quick HTTP smoke checks. Usage:
 *   SMOKE_URL=https://lifeetc-barcode.netlify.app SMOKE_PASSWORD='...' node scripts/smoke-studio.mjs
 */
const base = (process.env.SMOKE_URL || "http://localhost:3456").replace(/\/$/, "");
const password = process.env.SMOKE_PASSWORD || process.env.APP_ACCESS_PASSWORD || "";

if (!password) {
  console.error("Set SMOKE_PASSWORD or APP_ACCESS_PASSWORD.");
  process.exit(1);
}

const jar = { cookie: "" };

async function fetchJson(path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (jar.cookie) headers.cookie = jar.cookie;
  const response = await fetch(`${base}${path}`, { ...init, headers, redirect: "manual" });
  const setCookie = response.headers.getSetCookie?.() || [];
  for (const value of setCookie) {
    const part = value.split(";")[0];
    jar.cookie = jar.cookie ? `${jar.cookie}; ${part}` : part;
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data };
}

const checks = [];

function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  let login = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  check("Login", login.response.status === 200, String(login.response.status));

  let home = await fetch(`${base}/`, { headers: { cookie: jar.cookie } });
  check("Dashboard HTML", home.status === 200 && (await home.text()).includes("Studio"));

  const pages = ["/products", "/barcodes", "/labels", "/print", "/inventory", "/settings/categories"];
  for (const path of pages) {
    const res = await fetch(`${base}${path}`, { headers: { cookie: jar.cookie } });
    check(`GET ${path}`, res.status === 200);
  }

  const sync = await fetchJson("/api/square/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ trigger: "manual" }),
  });
  const syncMsg = String(sync.data?.message || sync.data?.error || "");
  const syncOk =
    sync.data?.skipped ||
    sync.data?.variations ||
    syncMsg.includes("Imported") ||
    syncMsg.includes("less than 10 minutes") ||
    syncMsg.includes("already running");
  check("Square sync", syncOk, sync.data?.message || sync.data?.error || String(sync.response.status));

  const focus = await fetchJson("/api/catalog", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "saveCategoryFocus", enabled: true, names: ["Christmas Market"] }),
  });
  check("Save category focus", focus.response.status === 200, focus.data?.message || focus.data?.error);

  const focusOff = await fetchJson("/api/catalog", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "saveCategoryFocus", enabled: false, names: [] }),
  });
  check("Clear category focus", focusOff.response.status === 200, focusOff.data?.message || focusOff.data?.error);

  const barcodeImg = await fetch(`${base}/api/barcodes/image?value=TEST123&format=code128`, {
    headers: { cookie: jar.cookie },
  });
  check("Barcode image", barcodeImg.status === 200, barcodeImg.headers.get("content-type") || "");

  const failed = checks.filter((row) => !row.ok);
  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} checks passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
