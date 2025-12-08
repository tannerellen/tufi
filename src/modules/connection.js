import { getScreen } from "../screen";
import { getDeviceLink, stationDump } from "../commands";
import { listUpdate } from "../ui/listTable";
import { asyncTimeout } from "../utils/utils";

let connectionUi;

export function registerConnectionUi(renderedConnectionUi) {
  connectionUi = renderedConnectionUi;
}

export async function checkActiveConnection() {
  try {
    // Get connection info
    let activeConnection;
    // The data isn't always updated in the drive so start a loop watching for
    // a bit if the data changes. Don't continue the loop though after many iterations
    for (let i = 0; i < 20; i++) {
      const deviceLink = await getDeviceLink();
      const waitingForData =
        !!deviceLink && (!deviceLink?.channelWidth || deviceLink?.rate < 100);
      activeConnection = deviceLink ? [mutateConnectionEntry(deviceLink)] : [];

      if (!waitingForData) {
        break;
      } else if (i === 0) {
        // Update the view with any partial info we have
        updateActiveConnection(activeConnection);
        // Try to trigger a device data update
        // Ping to 127.0.0.1 may also serve the same purpose to force driver data update
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

function mutateConnectionEntry(connection) {
  const connectionClone = { ...connection };
  if (!connectionClone.channelWidth) {
    connectionClone.channelWidth = "--";
    connectionClone.rate = "--";
  } else {
    connectionClone.rate = `${Math.round(parseInt(connectionClone.rate))} Mb/s`;
  }
  return connectionClone;
}
