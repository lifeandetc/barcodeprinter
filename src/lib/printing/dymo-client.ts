type DymoPrinter = {
  name: string;
  modelName?: string;
  isConnected?: boolean;
  printerType?: string;
};

type Framework = {
  init: (callback?: () => void) => void;
  checkEnvironment: () => { isWebServicePresent: boolean; errorDetails?: string };
  getPrinters: () => DymoPrinter[];
  getPrintersAsync?: () => Promise<DymoPrinter[]>;
  getPrintersByTypeAsync?: (printerType: string) => Promise<DymoPrinter[]>;
  printLabel: (printerName: string, printParamsXml: string, labelXml: string, labelSetXml?: string) => void;
  openLabelXml?: (xml: string) => { isValidLabel?: () => boolean };
};

const PRINTER_STORAGE_KEY = "lifeEtcDymoPrinter";

declare global {
  interface Window {
    dymo?: { label?: { framework?: Framework } };
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

export function loadDymoFramework() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.dymo?.label?.framework) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-dymo-framework]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("The DYMO framework file failed to load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "/vendor/dymo.connect.framework.js";
    script.async = true;
    script.dataset.dymoFramework = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("DYMO Connect Framework is not available in this app build. Use the PDF and print it from this Mac."));
    document.body.appendChild(script);
  });
}

function normalizePrinters(raw: unknown): DymoPrinter[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const printer = entry as DymoPrinter;
      const name = typeof printer.name === "string" ? printer.name.trim() : "";
      if (!name) return null;
      return printer;
    })
    .filter(Boolean) as DymoPrinter[];
}

export function pickDymoPrinter(printers: DymoPrinter[], preferredName?: string | null) {
  if (!printers.length) return null;
  if (preferredName) {
    const saved = printers.find((printer) => printer.name === preferredName);
    if (saved) return saved;
  }
  const labelWriters = printers.filter(
    (printer) => printer.printerType === "LabelWriterPrinter" || /dymo|labelwriter/i.test(printer.name),
  );
  const pool = labelWriters.length ? labelWriters : printers;
  return pool.find((printer) => /450/i.test(printer.name)) ?? pool[0];
}

export function rememberedDymoPrinterName() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PRINTER_STORAGE_KEY);
}

export function rememberDymoPrinterName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRINTER_STORAGE_KEY, name);
}

async function listPrintersFromFramework(framework: Framework): Promise<DymoPrinter[]> {
  if (framework.getPrintersByTypeAsync) {
    try {
      const labelWriters = normalizePrinters(await framework.getPrintersByTypeAsync("LabelWriterPrinter"));
      if (labelWriters.length) return labelWriters;
    } catch {
      // fall through
    }
  }
  if (framework.getPrintersAsync) {
    for (const waitMs of [0, 1200, 2500]) {
      if (waitMs) await delay(waitMs);
      try {
        const printers = normalizePrinters(await framework.getPrintersAsync());
        if (printers.length) return printers;
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!/discovery is in progress/i.test(message)) throw error;
      }
    }
  }
  return normalizePrinters(framework.getPrinters?.() ?? []);
}

export async function detectDymoPrinters() {
  await loadDymoFramework();
  const framework = window.dymo?.label?.framework;
  if (!framework) {
    throw new Error(
      "DYMO Connect is not available in this browser. Install DYMO Connect on this Mac, then allow local network access for this site in Chrome (lock icon → Local Network).",
    );
  }
  await new Promise<void>((resolve) => {
    try {
      framework.init(() => resolve());
    } catch {
      resolve();
    }
  });
  const environment = framework.checkEnvironment?.();
  if (environment && environment.isWebServicePresent === false) {
    throw new Error(environment.errorDetails || "DYMO Connect software is not running on this Mac. Open DYMO Connect and try again.");
  }
  return listPrintersFromFramework(framework);
}

export async function printDymoLabel(printerName: string, labelXml: string, printParamsXml: string) {
  const framework = window.dymo?.label?.framework;
  if (!framework) throw new Error("DYMO is not connected in this browser.");
  const { fixDymoConnectLabelXml } = await import("@/lib/labels/dymo-xml");
  const xml = fixDymoConnectLabelXml(labelXml);
  const label = framework.openLabelXml?.(xml);
  if (label?.isValidLabel && !label.isValidLabel()) {
    throw new Error("DYMO Connect rejected this label size or layout. Adjust the stock size, or print the PDF instead.");
  }
  const params = fixDymoConnectLabelXml(printParamsXml);
  framework.printLabel(printerName, params, xml, "");
  rememberDymoPrinterName(printerName);
}

export const DYMO_NO_PRINTER_HELP =
  "DYMO Connect is running, but no LabelWriter was listed. Open DYMO Connect and confirm your printer appears there. In Chrome, allow Local network access for this site. Unplug and replug the USB cable, then try Settings → Printer setup → Look for DYMO printers.";
