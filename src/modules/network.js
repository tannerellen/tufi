import { getScreen } from "../screen";
import {
  isWifiEnabled,
  wifiPower,
  getWifiList,
  getKnownNetworks,
  deleteNetworkConnection,
} from "../commands";

import { listUpdate } from "../ui/listTable";
import { restoreRowPositions } from "../navigation";
import { messageUi } from "../ui/message";
import { asyncTimeout } from "../utils/utils";

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
      content: `Turning ${newState} wifi...`,
    });
    await wifiPower(newState);
    await asyncTimeout(isEnabled ? 500 : 3500);
    message.destroy();

    return;
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
      knownNetworksAvailable.push(network);
    } else {
      allNetworksUnique.push(network);
    }
  }

  return {
    allNetworks: allNetworksUnique,
    knownNetworks: knownNetworksAvailable,
  };
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
