import { getScreen } from "../screen";
import {
  getWifiList,
  getKnownNetworks,
  deleteConnection,
  activateConnection,
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
  try {
    if (connected) {
      await disconnectFromNetwork(ssid);
    } else {
      // Known networks have a saved profile, activate it rather than creating
      // a new one. If there are several, use the most recently used.
      const [profile] = getProfilesForSsid(ssid);
      if (!profile) {
        throw new Error(`No saved profile found for ${ssid}`);
      }
      await activateConnection(profile.uuid);
    }
  } catch (err) {
    message.destroy();
    showError(err instanceof Error ? err.message : String(err));
    return;
  }
  message.destroy();
  screen.render();
}

/** @type {(content: string) => void} */
function showError(content) {
  const screen = getScreen();
  const errorMessage = messageUi(screen, {
    top: /** @type {number} */ (screen.height) - 1,
    left: 0,
    right: 0,
    height: "shrink",
    content,
    color: "red",
  });
  screen.render();
  setTimeout(() => {
    errorMessage.destroy();
    screen.render();
  }, 4000);
}

/** @type {() => NetworkLists} */
export function getNetworkLists() {
  const [allNetworks, knownNetworks] = rawLists;
  return buildNetworkLists(allNetworks, knownNetworks);
}

/**
 * Forget a network by deleting every saved profile that connects to its ssid
 * @type {(ssid: string) => Promise<void>}
 */
export async function deleteNetwork(ssid) {
  const profiles = getProfilesForSsid(ssid);
  if (!profiles.length) {
    throw new Error(`No saved profile found for ${ssid}`);
  }
  for (const profile of profiles) {
    await deleteConnection(profile.uuid);
    removeFromKnownNetworks(profile.uuid);
  }
  await asyncTimeout(100); // Small delay to give state a chance to update
  const [allNetworks, knownNetworks] = rawLists;
  const networkLists = buildNetworkLists(allNetworks, knownNetworks);
  updateNetworkLists(networkLists);
}

/**
 * Saved profiles for an ssid, most recently used first
 * @type {(ssid: string) => KnownNetwork[]}
 */
function getProfilesForSsid(ssid) {
  return (rawLists?.[1] ?? [])
    .filter((profile) => profile.ssid === ssid)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/** @type {(uuid: string) => void} */
function removeFromKnownNetworks(uuid) {
  const knownNetworks = rawLists[1];
  const index = knownNetworks.findIndex((profile) => profile.uuid === uuid);
  if (index !== -1) {
    knownNetworks.splice(index, 1);
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
