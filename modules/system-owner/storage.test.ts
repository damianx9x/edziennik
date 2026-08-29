import { describe, expect, it } from "vitest";

import { classifyStorageTargets } from "./storage";

describe("classifyStorageTargets", () => {
  it("does not offer the external data vault as its own backup", () => {
    const result = classifyStorageTargets([
      {
        name: "sda",
        path: "/dev/sda",
        type: "disk",
        size: 2_000_000_000_000,
        tran: "usb",
        children: [
          {
            name: "sda3",
            path: "/dev/sda3",
            type: "part",
            size: 200_000_000_000,
            children: [
              {
                name: "kla-data",
                path: "/dev/mapper/kla-data",
                type: "crypt",
                size: 199_000_000_000,
                mountpoints: ["/srv/kla-vault"],
              },
            ],
          },
        ],
      },
    ]);

    expect(result.mountedUsb).toHaveLength(0);
    expect(result.primaryExternal.map((item) => item.path)).toEqual([
      "/dev/mapper/kla-data",
    ]);
  });

  it("offers a separate mounted USB partition", () => {
    const result = classifyStorageTargets([
      {
        name: "sdb",
        path: "/dev/sdb",
        type: "disk",
        size: 500_000_000_000,
        tran: "usb",
        children: [
          {
            name: "sdb1",
            path: "/dev/sdb1",
            type: "part",
            size: 499_000_000_000,
            mountpoints: ["/media/icex/KLA_BACKUP"],
          },
        ],
      },
    ]);

    expect(result.mountedUsb.map((item) => item.path)).toEqual(["/dev/sdb1"]);
    expect(result.primaryExternal).toHaveLength(0);
  });
});
