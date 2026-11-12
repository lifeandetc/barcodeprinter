import { describe, expect, it } from "vitest";
import { pickDymoPrinter } from "@/lib/printing/dymo-client";

describe("pickDymoPrinter", () => {
  const printers = [
    { name: "DYMO LabelWriter 450 Turbo", printerType: "LabelWriterPrinter", isConnected: false },
    { name: "Office Laser", printerType: "LaserPrinter", isConnected: true },
  ];

  it("prefers a saved printer name", () => {
    expect(pickDymoPrinter(printers, "Office Laser")?.name).toBe("Office Laser");
  });

  it("prefers LabelWriter 450 models", () => {
    expect(pickDymoPrinter(printers, null)?.name).toBe("DYMO LabelWriter 450 Turbo");
  });
});
