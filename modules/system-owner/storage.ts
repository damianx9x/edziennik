import type { StorageDevice } from "./server-control";

function flatten(
  devices: StorageDevice[],
  inherited: Pick<StorageDevice, "tran" | "rm" | "hotplug"> = {},
): StorageDevice[] {
  return devices.flatMap((device) => {
    const resolved = {
      ...device,
      tran: device.tran ?? inherited.tran,
      rm: device.rm ?? inherited.rm,
      hotplug: device.hotplug ?? inherited.hotplug,
    };
    return [resolved, ...flatten(device.children ?? [], resolved)];
  });
}

export function classifyStorageTargets(storage: StorageDevice[]) {
  const devices = flatten(storage);
  const externalPartitions = devices.filter(
    (item) =>
      item.type === "part" &&
      item.mountpoints?.some(Boolean) &&
      (item.tran === "usb" || item.rm || item.hotplug),
  );

  return {
    mountedUsb: externalPartitions.filter((item) =>
      item.mountpoints?.some(
        (path) => path?.startsWith("/media/") || path?.startsWith("/mnt/"),
      ),
    ),
    primaryExternal: devices.filter(
      (item) =>
        item.mountpoints?.includes("/srv/kla-vault") &&
        (item.tran === "usb" || item.rm || item.hotplug),
    ),
  };
}
