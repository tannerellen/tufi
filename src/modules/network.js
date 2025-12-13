import { getScreen } from "../screen";
import {
  getWifiList,
  getKnownNetworks,
  deleteNetworkConnection,
  connectToNetwork,
  disconnectFromNetwork,
} from "../commands";

import { listUpdate } from "../ui/listTable";
import { restoreRowPositions } from "../navigation";
import { messageUi } from "../ui/message";
import { asyncTimeout } from "../utils/utils";

/** @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement */
/** @typedef {import('../../types/types.d.ts').Network} Network */
/** @typedef {import('../../types/types.d.ts').KnownNetwork} KnownNetwork */
/** @typedef {import('../../types/types.d.ts').NetworkDisplay} NetworkDisplay */
/** @typedef {import('../../types/types.d.ts').NetworkLists} NetworkLists */
/** @typedef {[Network[], KnownNetwork[]]} RawNetworkLists */

/** @type {RawNetworkLists} */
let rawLists;
/** @type {BlessedElement} */
let knownNetworksUi;
/** @type {BlessedElement} */
let networksUi;

/** @type {(renderedKnownNetworksUi: BlessedElement, renderedNetworksUi: BlessedElement) => void} */
export function registerNetworkUi(renderedKnownNetworksUi, renderedNetworksUi) {
  knownNetworksUi = renderedKnownNetworksUi;
  networksUi = renderedNetworksUi;
}

/** @type {(rescan?: boolean) => Promise<NetworkLists>} */
export function scanNetworks(rescan) {
  return new Promise((resolve, reject) => {
    generateNetworkLists(rescan)
      .then((networkLists) => {
        updateNetworkLists(networkLists);
        resolve(networkLists);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

/** @type {(networkLists: NetworkLists) => void} */
function updateNetworkLists(networkLists) {
  const screen = getScreen();
  listUpdate(knownNetworksUi, networkLists.knownNetworks, [
    { label: "Name", key: "ssid" },
    { label: "Security", key: "security" },
    { label: "Signal", key: "signal" },
    { label: "Connected", key: "connected" },
  ]);
  listUpdate(networksUi, networkLists.allNetworks, [
    { label: "Name", key: "ssid" },
    { label: "Security", key: "security" },
    { label: "Signal", key: "signal" },
  ]);
  restoreRowPositions();
  screen.render();
}

/** @type {(rescan?: boolean) => Promise<NetworkLists>} */
function generateNetworkLists(rescan) {
  return new Promise((resolve, reject) => {
    /** @type {[Promise<Network[]>, Promise<KnownNetwork[]>]} */
    const promises = [getWifiList(rescan), getKnownNetworks()];

    Promise.all(promises)
      .then((result) => {
        const [allNetworks, knownNetworks] = result;
        rawLists = result;
        resolve(buildNetworkLists(allNetworks, knownNetworks));
      })
      .catch((err) => {
        reject(err);
      });
  });
}

/** @type {(ssid: string, connected: boolean) => Promise<void>} */
export async function toggleWifiConnection(ssid, connected) {
  const screen = getScreen();
  const messageContent = connected
    ? `Disconnecting from ${ssid}...`
    : `Connecting to ${ssid}...`;
  const message = messageUi(screen, {
    top: /** @type {number} */ (screen.height) - 1,
    left: 0,
    right: 0,
    height: "shrink",
    content: messageContent,
    loader: true,
  });
  screen.render();
  if (connected) {
    await disconnectFromNetwork(ssid);
  } else {
    await connectToNetwork(ssid);
  }
  message.destroy();
  screen.render();
}

/** @type {() => NetworkLists} */
export function getNetworkLists() {
  const [allNetworks, knownNetworks] = rawLists;
  return buildNetworkLists(allNetworks, knownNetworks);
}

/** @type {(ssid: string) => Promise<void>} */
export async function deleteNetwork(ssid) {
  try {
    await deleteNetworkConnection(ssid);
    removeFromKnownNetworks(ssid);
    await asyncTimeout(100); // Small delay to give state a chance to update
    const [allNetworks, knownNetworks] = rawLists;
    const networkLists = buildNetworkLists(allNetworks, knownNetworks);
    updateNetworkLists(networkLists);
    return;
  } catch (err) {
    throw err;
  }
}

/** @type {(ssid: string) => void} */
function removeFromKnownNetworks(ssid) {
  const knownNetworks = rawLists[1];
  for (let i = 0; i < knownNetworks.length; i++) {
    if (knownNetworks[i].ssid === ssid) {
      knownNetworks.splice(i, 1);
      return;
    }
  }
}

/** @type {(allNetworks: Network[], knownNetworks: KnownNetwork[]) => NetworkLists} */
function buildNetworkLists(allNetworks, knownNetworks) {
  const allNetworksUnique = [];
  const knownNetworksAvailable = [];

  const knownSet = new Set();

  for (const knownNetwork of knownNetworks) {
    knownSet.add(knownNetwork.ssid);
  }

  const uniqueNetworks = deDuplicateNetworks(allNetworks);
  for (const network of uniqueNetworks) {
    if (knownSet.has(network.ssid)) {
      knownNetworksAvailable.push(mutateNetworkEntry(network));
    } else {
      allNetworksUnique.push(mutateNetworkEntry(network));
    }
  }

  return {
    allNetworks: allNetworksUnique,
    knownNetworks: knownNetworksAvailable,
  };
}

/** @type {(network: Network) => NetworkDisplay} */
function mutateNetworkEntry(network) {
  /** @type {NetworkDisplay} */
  const networkClone = /** @type {any} */ ({ ...network });
  networkClone.connected = network.connected ? "✔" : "";
  networkClone.signal = network.signal.toString() + "%";
  return networkClone;
}

/** @type {(networks: Network[]) => Network[]} */
function deDuplicateNetworks(networks) {
  const networkMap = new Map();
  for (const network of networks) {
    if (!network.ssid || (networkMap.has(network.ssid) && !network.connected)) {
      continue;
    }
    networkMap.set(network.ssid, { ...network });
  }
  return [...networkMap.values()];
}
