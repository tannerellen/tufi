import { getScreen } from "../screen";
import { getDeviceLink, stationDump } from "../commands";
import { listUpdate } from "../ui/listTable";
import { asyncTimeout } from "../utils/utils";

/** * @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement */
/** * @typedef {import('../../types/types.d.ts').DeviceLink} DeviceLink */

/** @type {BlessedElement} */
let connectionUi;

/** @type {(renderedConnectionUi: BlessedElement) => void} */
export function registerConnectionUi(renderedConnectionUi) {
  connectionUi = renderedConnectionUi;
}

/** @type {() => Promise<void>} */
export async function checkActiveConnection() {
  try {
    // Get connection info
    /** @type {Array<{[key: string]: string}>} */
    let activeConnection = [];
    // The data isn't always updated in the drive so start a loop watching for
    // a bit if the data changes. Don't continue the loop though after many iterations
    for (let i = 0; i < 20; i++) {
      const deviceLink = await getDeviceLink();
      const waitingForData =
        Object.keys(deviceLink).length &&
        (!deviceLink?.channelWidth || deviceLink?.rate < 100);

      activeConnection = Object.keys(deviceLink).length
        ? [mutateConnectionEntry(deviceLink)]
        : [];

      if (!waitingForData) {
        break;
      } else if (i === 0) {
        // Update the view with any partial info we have
        updateActiveConnection(activeConnection);
        // Try to trigger a device data update
        await stationDump();
      }
      await asyncTimeout(500);
    }
    // Final view update
    updateActiveConnection(activeConnection);
    return;
  } catch (err) {
    throw err;
  }
}

/** @type {(activeConnection: {[key: string]: string}[]) => Promise<void>} */
async function updateActiveConnection(activeConnection) {
  const screen = getScreen();
  listUpdate(connectionUi, activeConnection, [
    { label: "Name", key: "ssid" },
    { label: "Band", key: "band" },
    { label: "Channel", key: "channel" },
    { label: "Width", key: "channelWidth" },
    { label: "Rate", key: "rate" },
  ]);
  screen.render();
}

export async function removeActiveConnection() {
  try {
    await updateActiveConnection([]);
    return;
  } catch (err) {
    throw err;
  }
}

/** @type {(deviceLink: DeviceLink) => {[key:string]: string}} */
function mutateConnectionEntry(deviceLink) {
  /** @type {{[key: string]: string}} */
  const connection = {};

  for (const property in deviceLink) {
    const key = /** @type {keyof DeviceLink} */ (property);
    connection[property] = String(deviceLink[key]);
  }

  if (!connection.channelWidth) {
    connection.channelWidth = "--";
    connection.rate = "--";
  } else {
    connection.rate = `${Math.round(Number(deviceLink.rate))} Mb/s`;
  }
  return connection;
}
