import { getScreen } from "../screen";
import {
  getWifiList,
  getKnownNetworks,
  deleteNetworkConnection,
} from "../commands";

import { listUpdate } from "../ui/listTable";
import { restoreRowPositions } from "../navigation";

let rawLists;
let knownNetworksUi;
let networksUi;

export function registerNetworkUi(renderedKnownNetworksUi, renderedNetworksUi) {
  knownNetworksUi = renderedKnownNetworksUi;
  networksUi = renderedNetworksUi;
}

export function scanNetworks() {
  return new Promise((resolve, reject) => {
    generateNetworkLists()
      .then((networkLists) => {
        updateNetworkLists(networkLists);
        resolve(networkLists);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function updateNetworkLists(networkLists) {
  const screen = getScreen();
  listUpdate(knownNetworksUi, networkLists.knownNetworks, [
    "Name",
    "Security",
    "Signal",
    "Connected",
  ]);
  listUpdate(networksUi, networkLists.allNetworks, [
    "Name",
    "Security",
    "Signal",
  ]);
  restoreRowPositions();
  screen.render();
}

function generateNetworkLists() {
  return new Promise((resolve, reject) => {
    const promises = [getWifiList(), getKnownNetworks()];

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

export function getNetworkLists() {
  const [allNetworks, knownNetworks] = rawLists;
  return buildNetworkLists(allNetworks, knownNetworks);
}

export async function deleteNetwork(ssid) {
  try {
    await deleteNetworkConnection(ssid);
    removeFromKnownNetworks(ssid);
    const [allNetworks, knownNetworks] = rawLists;
    const networkLists = buildNetworkLists(allNetworks, knownNetworks);
    updateNetworkLists(networkLists);
    return;
  } catch (err) {
    throw err;
  }
}

function removeFromKnownNetworks(ssid) {
  for (let i = 0; i < rawLists.knownNetworks.length; i++) {
    if (rawLists.knownNetworks[i].ssid === ssid) {
      rawLists.knownNetworks.splice(i, 1);
      return;
    }
  }
}

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

function mutateNetworkEntry(network) {
  const networkClone = { ...network };
  networkClone.connected = network.connected ? "✔" : "";
  networkClone.signal = network.signal.toString() + "%";
  return networkClone;
}

function deDuplicateNetworks(networks) {
  const networkMap = new Map();
  for (const network of networks) {
    if (!network.ssid || (networkMap.has(network.ssid) && !network.connected)) {
      continue;
    }
    networkMap.set(network.ssid, network);
  }
  return [...networkMap.values()];
}
