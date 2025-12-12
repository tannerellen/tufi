import { getScreen } from "../screen";
import {
  getDeviceDetail,
  getWifiInterface,
  isWifiEnabled,
  wifiPower,
} from "../commands";
import { messageUi } from "../ui/message";
import { asyncTimeout } from "../utils/utils";

/** @type {() => Promise<{[key: string]: string}[]>} */
export async function getDeviceList() {
  const iface = await getWifiInterface();
  const deviceDetail = await getDeviceDetail(iface);

  return deviceDetail;
}

/** @type {() => Promise<boolean>} */
export async function togglePower() {
  const screen = getScreen();
  try {
    const isEnabled = await isWifiEnabled();
    const newState = isEnabled ? "off" : "on";
    const message = messageUi(screen, {
      top: /** @type {number} */ (screen.height) - 1,
      left: 0,
      right: 0,
      height: "shrink",
      content: `Turning wifi ${newState}...`,
      loader: true,
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
