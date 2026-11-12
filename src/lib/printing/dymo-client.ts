import { fixDymoConnectLabelXml } from "@/lib/labels/dymo-xml";

type DymoPrinter = {
  name: string;
  modelName?: string;
  isConnected?: boolean;
  printerType?: string;
};

type DymoLabelHandle = {
  isValidLabel?: () => boolean;
  getLabelXml?: () => string;
  print?: (printerName: string, printParamsXml?: string, labelSetXml?: string) => void;
  printAsync?: (printerName: string, printParamsXml?: string, labelSetXml?: string) => Promise<void>;
};

type Framework = {
  init: (callback?: () => void) => void;
  checkEnvironment: () => { isWebServicePresent: boolean; errorDetails?: string };
  getPrinters: () => DymoPrinter[];
  getPrintersAsync?: () => Promise<DymoPrinter[]>;
  getPrintersByTypeAsync?: (printerType: string) => Promise<DymoPrinter[]>;
  printLabel: (printerName: string, printParamsXml: string, labelXml: string, labelSetXml?: string) => void;
  printLabelAsync?: (
    printerName: string,
    printParamsXml: string,
    labelXml: string,
    labelSetXml?: string,
  ) => Promise<void>;
  openLabelXml?: (xml: string) => DymoLabelHandle;
  createLabelWriterPrintParamsXml?: (params: Record<string, unknown>) => string;
};

type DymoThenable = {
  then?: (onFulfilled: () => void) => DymoThenable;
  thenCatch?: (onRejected: (error: unknown) => void) => void;
};

const PRINTER_STORAGE_KEY = "lifeEtcDymoPrinter";

declare global {
  interface Window {
    dymo?: { label?: { framework?: Framework }; xml?: DymoXmlApi };
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

type DymoXmlApi = {
  serialize?: (node: unknown) => string;
  __lifeEtcPatched?: boolean;
};

/** DYMO Connect re-serializes labels via goog.dom and breaks empty tags; normalize on the way out. */
export function patchDymoXmlSerialize() {
  if (typeof window === "undefined") return;
  const xmlApi = window.dymo?.xml as DymoXmlApi | undefined;
  if (!xmlApi?.serialize || xmlApi.__lifeEtcPatched) return;
  const original = xmlApi.serialize.bind(xmlApi);
  xmlApi.serialize = (node: unknown) => fixDymoConnectLabelXml(original(node));
  xmlApi.__lifeEtcPatched = true;
}

export function loadDymoFramework() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.dymo?.label?.framework) {
    patchDymoXmlSerialize();
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-dymo-framework]");
    if (existing) {
      const done = () => {
        patchDymoXmlSerialize();
        resolve();
      };
      if (window.dymo?.label?.framework) {
        done();
        return;
      }
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", () => reject(new Error("The DYMO framework file failed to load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "/vendor/dymo.connect.framework.js?v=lifeetc-2";
    script.async = true;
    script.dataset.dymoFramework = "true";
    script.onload = () => {
      patchDymoXmlSerialize();
      resolve();
    };
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
  patchDymoXmlSerialize();
  const environment = framework.checkEnvironment?.();
  if (environment && environment.isWebServicePresent === false) {
    throw new Error(environment.errorDetails || "DYMO Connect software is not running on this Mac. Open DYMO Connect and try again.");
  }
  return listPrintersFromFramework(framework);
}

function buildPrintParamsXml(framework: Framework, fallback: string, twinTurboRoll: string) {
  if (framework.createLabelWriterPrintParamsXml) {
    try {
      return framework.createLabelWriterPrintParamsXml({
        copies: 1,
        twinTurboRoll,
        printQuality: "Barcode",
        jobTitle: "Life and Etc",
      });
    } catch {
      // use fallback
    }
  }
  return fallback;
}

function awaitFrameworkPrint(
  framework: Framework,
  printerName: string,
  params: string,
  xml: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const fail = (error: unknown) => reject(error instanceof Error ? error : new Error(String(error)));
      if (!framework.printLabelAsync) {
        framework.printLabel(printerName, params, xml, "");
        resolve();
        return;
      }
      const job = framework.printLabelAsync(printerName, params, xml, "");
      if (job == null) {
        resolve();
        return;
      }
      const thenable = job as DymoThenable & {
        then?: (onFulfilled?: () => void, onRejected?: (error: unknown) => void) => DymoThenable | void;
      };
      if (typeof thenable.then === "function") {
        const chained = thenable.then(() => resolve(), fail);
        if (chained && typeof (chained as DymoThenable).thenCatch === "function") {
          (chained as DymoThenable).thenCatch?.(fail);
        }
        return;
      }
      void Promise.resolve(job).then(() => resolve()).catch(fail);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function printDymoLabel(
  printerName: string,
  labelXml: string,
  printParamsXml: string,
  twinTurboRoll: "Auto" | "Left" | "Right" = "Auto",
) {
  const framework = window.dymo?.label?.framework;
  if (!framework) throw new Error("DYMO is not connected in this browser.");
  patchDymoXmlSerialize();
  const xml = fixDymoConnectLabelXml(labelXml);
  const label = framework.openLabelXml?.(xml);
  if (label?.isValidLabel && !label.isValidLabel()) {
    throw new Error("DYMO Connect rejected this label size or layout. Adjust the stock size, or print the PDF instead.");
  }
  const params = fixDymoConnectLabelXml(buildPrintParamsXml(framework, printParamsXml, twinTurboRoll));
  await awaitFrameworkPrint(framework, printerName, params, xml);
  rememberDymoPrinterName(printerName);
}

export async function printDymoSanityTest(printerName: string) {
  const { dymoSanityTestLabelXml } = await import("@/lib/labels/dymo-test-label");
  const { dymoPrintParams } = await import("@/lib/labels/dymo-xml");
  await printDymoLabel(printerName, dymoSanityTestLabelXml(), dymoPrintParams(1, "barcode", "Auto"), "Auto");
}

export const DYMO_NO_PRINTER_HELP =
  "DYMO Connect is running, but no LabelWriter was listed. Open DYMO Connect and confirm your printer appears there. In Chrome, allow Local network access for this site. Unplug and replug the USB cable, then try Settings → Printer setup → Look for DYMO printers.";
