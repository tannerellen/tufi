import { getScreen } from "../screen";
import {
  getWifiList,
  getKnownNetworks,
  deleteNetworkConnection,
} from "../commands";

import { listUpdate } from "../ui/listTable";
import { restoreRowPositions } from "../navigation";

let rawLists;

export function scanNetworks(renderedKnownNetworksUi, renderedNetworksUi) {
  return new Promise((resolve, reject) => {
    const screen = getScreen();
    generateNetworkLists()
      .then((networkLists) => {
        listUpdate(renderedKnownNetworksUi, networkLists.knownNetworks, [
          "Name",
          "Security",
          "Signal",
          "Connected",
        ]);
        listUpdate(renderedNetworksUi, networkLists.allNetworks, [
          "Name",
          "Security",
          "Signal",
        ]);
        restoreRowPositions();
        screen.render();
        resolve(networkLists);
      })
      .catch((err) => {
        reject(err);
      });
  });
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
  } catch (err) {
    throw err;
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
