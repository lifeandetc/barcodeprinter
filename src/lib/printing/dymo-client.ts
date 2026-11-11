type DymoPrinter = { name: string; modelName?: string; isConnected?: boolean };

type Framework = {
  init: (callback?: () => void) => void;
  checkEnvironment: () => { isWebServicePresent: boolean; errorDetails?: string };
  getPrinters: () => DymoPrinter[];
  printLabel: (printerName: string, printParamsXml: string, labelXml: string, labelSetXml?: string) => void;
  openLabelXml?: (xml: string) => { isValidLabel?: () => boolean };
};

declare global {
  interface Window {
    dymo?: { label?: { framework?: Framework } };
  }
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

export async function detectDymoPrinters() {
  await loadDymoFramework();
  const framework = window.dymo?.label?.framework;
  if (!framework) {
    throw new Error("DYMO Connect is not available in this browser. Install DYMO Connect on this Mac, then allow local network access for this site. A website cannot silently print to a USB printer.");
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
    throw new Error(environment.errorDetails || "DYMO Connect software is not running on this Mac.");
  }
  return framework.getPrinters?.() ?? [];
}

export async function printDymoLabel(printerName: string, labelXml: string, printParamsXml: string) {
  const framework = window.dymo?.label?.framework;
  if (!framework) throw new Error("DYMO is not connected in this browser.");
  const label = framework.openLabelXml?.(labelXml);
  if (label?.isValidLabel && !label.isValidLabel()) {
    throw new Error("DYMO Connect rejected this label size or layout. Adjust the stock size, or print the PDF instead.");
  }
  framework.printLabel(printerName, printParamsXml, labelXml, "");
}
