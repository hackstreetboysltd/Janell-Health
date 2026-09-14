import { describe, expect, it } from "vitest";
import {
  visitEndTime,
  visitsOverlap,
} from "@/lib/booking-conflicts";

describe("visitsOverlap", () => {
  const base = new Date("2026-06-02T10:00:00");

  it("returns false when visits are back-to-back without overlap", () => {
    const firstEnd = visitEndTime(base, 60);
    expect(visitsOverlap(base, 60, firstEnd, 60)).toBe(false);
  });

  it("returns true when the second visit starts before the first ends", () => {
    const overlappingStart = new Date(base.getTime() + 30 * 60_000);
    expect(visitsOverlap(base, 120, overlappingStart, 60)).toBe(true);
  });

  it("returns false when visits are on separate days", () => {
    const nextDay = new Date("2026-06-03T10:00:00");
    expect(visitsOverlap(base, 120, nextDay, 120)).toBe(false);
  });
});

describe("visitEndTime", () => {
  it("adds duration minutes to the scheduled start", () => {
    const start = new Date("2026-06-02T10:00:00");
    const end = visitEndTime(start, 90);
    expect(end.getTime() - start.getTime()).toBe(90 * 60_000);
  });
});
