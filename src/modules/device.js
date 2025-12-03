import { getDeviceDetail, getWifiInterface } from "../commands";

export async function getDeviceList() {
  const iface = await getWifiInterface();
  const deviceDetail = await getDeviceDetail(iface);

  return deviceDetail;
}
