import { describe, expect, it } from "vitest";
import { isTagged } from "@/lib/catalog/tagged";

describe("tag check", () => {
  it("stays open until the pieces from the latest print are checked off", () => {
    expect(isTagged({ labelsPrinted: 4, taggedAt: null, lastPrintedAt: "2026-11-13T20:00:00.000Z" })).toBe(false);
    expect(
      isTagged({
        labelsPrinted: 4,
        taggedAt: "2026-11-13T20:05:00.000Z",
        lastPrintedAt: "2026-11-13T20:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isTagged({
        labelsPrinted: 8,
        taggedAt: "2026-11-13T20:05:00.000Z",
        lastPrintedAt: "2026-11-13T21:00:00.000Z",
      }),
    ).toBe(false);
  });
});
