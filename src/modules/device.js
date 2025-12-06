import { getScreen } from "../screen";
import {
  getDeviceDetail,
  getWifiInterface,
  isWifiEnabled,
  wifiPower,
} from "../commands";
import { messageUi } from "../ui/message";
import { asyncTimeout } from "../utils/utils";

export async function getDeviceList() {
  const iface = await getWifiInterface();
  const deviceDetail = await getDeviceDetail(iface);

  return deviceDetail;
}

export async function toggleWifi() {
  const screen = getScreen();
  try {
    const isEnabled = await isWifiEnabled();
    const newState = isEnabled ? "off" : "on";
    const message = messageUi(screen, {
      top: screen.height - 1,
      left: 0,
      right: 0,
      height: "shrink",
      content: `Turning wifi ${newState}...`,
    });
    screen.render();
    await wifiPower(newState);
    await asyncTimeout(500);
    message.destroy();
    screen.render();
    return !isEnabled;
  } catch (err) {
    throw err;
  }
}
