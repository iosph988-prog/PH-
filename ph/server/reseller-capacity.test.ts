import { describe, expect, it } from "vitest";
import { MAX_RESELLERS, calculateResellerCapacity } from "./db";

describe("reseller capacity", () => {
  it("reports available places below the 500-reseller limit", () => {
    expect(calculateResellerCapacity(21, 4)).toEqual({
      active: 21,
      pending: 4,
      total: 25,
      limit: MAX_RESELLERS,
      available: 475,
    });
  });

  it("reports the limit as reached when active and pending accounts total 500", () => {
    expect(calculateResellerCapacity(480, 20)).toEqual({
      active: 480,
      pending: 20,
      total: 500,
      limit: MAX_RESELLERS,
      available: 0,
    });
  });

  it("never reports negative availability or accepts fractional counts", () => {
    expect(calculateResellerCapacity(500.9, 2.8)).toEqual({
      active: 500,
      pending: 2,
      total: 502,
      limit: MAX_RESELLERS,
      available: 0,
    });
  });

  it("normalizes negative counts to zero", () => {
    expect(calculateResellerCapacity(-3, -2)).toEqual({
      active: 0,
      pending: 0,
      total: 0,
      limit: MAX_RESELLERS,
      available: MAX_RESELLERS,
    });
  });
});
