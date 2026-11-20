import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { storageGetSignedUrl } from "./storage";
import { listRemotePatches } from "./remotePatches";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn(), storageGetSignedUrl: vi.fn() }));

const rows = [
  {
    patch: {
      id: 1,
      slug: "headshot-alto",
      title: "HEADSHOT ALTO",
      game: "free-fire-max",
      section: "patches",
      interfaceTab: null,
      logoStorageKey: "remote-patches/headshot-alto/logo.png",
    },
    version: {
      id: 11,
      version: 1,
      fileName: "ALTO(3).3105",
      sha256: "a".repeat(64),
      sizeBytes: 12,
      status: "published",
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  },
  {
    patch: {
      id: 2,
      slug: "headshot-peito",
      title: "HEADSHOT PEITO",
      game: "free-fire-max",
      section: "patches",
      interfaceTab: null,
      logoStorageKey: "remote-patches/headshot-peito/logo.png",
    },
    version: {
      id: 12,
      version: 1,
      fileName: "PEITO(3).3105",
      sha256: "b".repeat(64),
      sizeBytes: 15,
      status: "published",
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  },
];

const orderBy = vi.fn().mockResolvedValue(rows);
const where = vi.fn().mockReturnValue({ orderBy });
const innerJoin = vi.fn().mockReturnValue({ where });
const from = vi.fn().mockReturnValue({ innerJoin });
const db = {
  execute: vi.fn().mockResolvedValue([[]]),
  select: vi.fn().mockReturnValue({ from }),
};

describe("remote patch catalog resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(db as never);
    vi.mocked(storageGetSignedUrl).mockRejectedValue(new Error("Storage signed URL failed (401): invalid token"));
  });

  it("returns patch metadata when logo URL signing fails", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    const catalog = await listRemotePatches();

    expect(catalog).toHaveLength(2);
    expect(catalog.map(({ slug, logoUrl, fileName }) => ({ slug, logoUrl, fileName }))).toEqual([
      { slug: "headshot-alto", logoUrl: null, fileName: "ALTO(3).3105" },
      { slug: "headshot-peito", logoUrl: null, fileName: "PEITO(3).3105" },
    ]);
    expect(storageGetSignedUrl).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledTimes(1);

    warning.mockRestore();
  });
});
