import { getScreen } from "../screen";
import {
  getDeviceLink,
  stationDump,
  getConnectivity,
  openUrl,
} from "../commands";
import { listUpdate } from "../ui/listTable";
import { textBox, updateTextBox } from "../ui/textBox";
import { asyncTimeout } from "../utils/utils";

/** * @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement */
/** * @typedef {import('../../types/types.d.ts').DeviceLink} DeviceLink */
/** * @typedef {import('../../types/types.d.ts').Connectivity} Connectivity */

// Plain http page that captive portals will redirect to their login page
const PORTAL_LOGIN_URL = "http://neverssl.com";
// How often to re-check connectivity while it isn't "full"
const POLL_INTERVAL = 3000;
// How long to keep re-checking after connecting if no portal is detected
const POLL_DURATION = 30000;

/** @type {{[key in Connectivity]: string}} */
const CONNECTIVITY_LABELS = {
  full: "Online",
  portal: "Sign-in required",
  limited: "Limited",
  none: "No internet",
  unknown: "--",
};

/** @type {BlessedElement} */
let connectionUi;
/** @type {BlessedElement} */
let portalHint;

/** @type {Array<{[key: string]: string}>} */
let activeConnection = [];
/** @type {Connectivity} */
let connectivity = "unknown";
/** @type {string | undefined} */
let currentSsid;
let pollDeadline = 0;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let pollTimer;

/** @type {(renderedConnectionUi: BlessedElement) => void} */
export function registerConnectionUi(renderedConnectionUi) {
  connectionUi = renderedConnectionUi;
  // Shown on the empty last line of the connection panel when a portal is detected
  portalHint = textBox({
    parent: /** @type {any} */ (connectionUi).parent,
    bottom: 0,
    left: 1,
    right: 1,
    height: 1,
    tags: true,
    hidden: true,
    style: { fg: "yellow" },
  });
  updateTextBox(
    portalHint,
    "Sign-in required: press {bold}b{/bold} to open the login page in a browser",
  );
}

/** @type {() => Promise<void>} */
export async function checkActiveConnection() {
  try {
    // Get connection info
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
        updateActiveConnection();
        // Try to trigger a device data update
        await stationDump();
      }
      await asyncTimeout(500);
    }

    const ssid = activeConnection[0]?.ssid;
    if (ssid !== currentSsid) {
      // New connection, watch connectivity for a while as the check settles
      currentSsid = ssid;
      pollDeadline = Date.now() + POLL_DURATION;
    }
    connectivity = ssid ? await safeGetConnectivity(false) : "unknown";

    // Final view update
    updateActiveConnection();
    scheduleConnectivityPoll();
    return;
  } catch (err) {
    throw err;
  }
}

export async function removeActiveConnection() {
  try {
    activeConnection = [];
    currentSsid = undefined;
    connectivity = "unknown";
    stopConnectivityPoll();
    updateActiveConnection();
    return;
  } catch (err) {
    throw err;
  }
}

/**
 * Open a page in the browser that a captive portal will redirect to its login.
 * Returns false if there is no active wifi connection.
 * @type {() => boolean}
 */
export function openPortalLogin() {
  if (!currentSsid) {
    return false;
  }
  openUrl(PORTAL_LOGIN_URL);
  return true;
}

/** @type {() => void} */
function updateActiveConnection() {
  const screen = getScreen();
  const rows = activeConnection.map((connection) => ({
    ...connection,
    internet: CONNECTIVITY_LABELS[connectivity],
  }));
  listUpdate(connectionUi, rows, [
    { label: "Name", key: "ssid" },
    { label: "Band", key: "band" },
    { label: "Channel", key: "channel" },
    { label: "Width", key: "channelWidth" },
    { label: "Rate", key: "rate" },
    { label: "Internet", key: "internet" },
  ]);
  if (currentSsid && connectivity === "portal") {
    portalHint.show();
  } else {
    portalHint.hide();
  }
  screen.render();
}

/**
 * Keep re-checking while a portal is detected (so we notice the login), and
 * for a short time after connecting while the first check settles.
 * @type {() => void}
 */
function scheduleConnectivityPoll() {
  stopConnectivityPoll();
  if (!currentSsid || connectivity === "full") {
    return;
  }
  if (connectivity !== "portal" && Date.now() > pollDeadline) {
    return;
  }
  pollTimer = setTimeout(async () => {
    pollTimer = undefined;
    if (!currentSsid) {
      return;
    }
    connectivity = await safeGetConnectivity(true);
    updateActiveConnection();
    scheduleConnectivityPoll();
  }, POLL_INTERVAL);
}

function stopConnectivityPoll() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = undefined;
  }
}

/** @type {(recheck: boolean) => Promise<Connectivity>} */
async function safeGetConnectivity(recheck) {
  try {
    return await getConnectivity(recheck);
  } catch (err) {
    return "unknown";
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
