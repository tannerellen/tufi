import { createScreen } from "./screen";
import { asyncTimeout } from "./utils/utils";
import { containerBox } from "./ui/layout";
import { listUi, listUpdate } from "./ui/listTable";
import { getDeviceList } from "./modules/device";
import { getStationList } from "./modules/station";
import {
  registerNetworkUi,
  scanNetworks,
  deleteNetwork,
  toggleWifiConnection,
} from "./modules/network";
import { togglePower } from "./modules/device";
import { connectWifi } from "./modules/wifi-dialog";
import {
  registerNavigation,
  saveRowPositions,
  restoreRowPositions,
} from "./navigation";
import { messageUi } from "./ui/message";

export async function initialize() {
  // create UI
  // create main screen object
  const screen = createScreen();
  // device
  const deviceContainer = containerBox({
    title: "Device",
    top: 0,
    height: 6,
  });
  screen.append(deviceContainer);
  const renderedDeviceUi = listUi(deviceContainer, {
    name: "focus-device",
    readOnly: true,
  });

  // station
  const stationContainer = containerBox({
    title: "Station",
    top: deviceContainer.height,
    height: 6,
  });
  screen.append(stationContainer);
  const renderedStationUi = listUi(stationContainer, {
    name: "focus-station",
    readOnly: true,
  });

  // known networks
  const knownNetworksContainer = containerBox({
    title: "Known Networks",
    top: deviceContainer.height + stationContainer.height,
    height: 10,
  });
  screen.append(knownNetworksContainer);
  const renderedKnownNetworksUi = listUi(knownNetworksContainer, {
    name: "focus-known-networks",
    onSelect: async (item, index) => {
      const rowData = renderedKnownNetworksUi.rows[index];
      const ssid = rowData[0]; // First column is SSID
      const connected = !!rowData[3];
      await toggleWifiConnection(ssid, connected);
      await reloadUiData();
    },
  });

  // all networks
  const allNetworksContainer = containerBox({
    title: "New Networks",
    top:
      deviceContainer.height +
      stationContainer.height +
      knownNetworksContainer.height,
    height: "shrink",
  });
  screen.append(allNetworksContainer);
  const renderedNetworksUi = listUi(allNetworksContainer, {
    name: "focus-all-networks",
    onSelect: (item, index) => {
      const rowData = renderedNetworksUi.rows[index];
      const ssid = rowData[0]; // First column is SSID
      screen.children.forEach((element) => {
        element.hide();
      });
      connectWifi(screen, ssid, (submitted) => {
        screen.children.forEach((element) => {
          element.show();
          reloadUiData(!submitted);
          renderedNetworksUi.focus();
          screen.render();
        });
      });
    },
  });

  // render to make sure we see something initially
  screen.render();

  // Register the rendered network ui elements so we can use them in network module
  registerNetworkUi(renderedKnownNetworksUi, renderedNetworksUi);
  // populate ui with data
  reloadUiData();
  renderedNetworksUi.focus();

  // Register navigation keys
  registerNavigation(screen, [renderedNetworksUi, renderedKnownNetworksUi]);

  // App level keys. Todo: Should these just be assigned to our network list elements?
  screen.key(["o"], async function (ch, key) {
    try {
      const isEnabled = await togglePower();
      await reloadUiData(); // Quickly update the ui regardless if we have networks
      if (isEnabled) {
        for (let i = 0; i < 30; i++) {
          const networks = await scan(500);
          if (networks.knownNetworks.length) {
            if (
              networks.knownNetworks.find((network) => {
                return !!network.connected;
              })
            ) {
              break;
            }
          } else if (networks.allNetworks.length) {
            break;
          }
        }
      }
      return;
    } catch (err) {
      // Show Error?
    }
  });

  screen.key(["s"], async function (ch, key) {
    await scan(500);
  });

  registerKnownNetworkActions(renderedKnownNetworksUi);

  // Private functions
  async function reloadUiData(noScan) {
    saveRowPositions([renderedNetworksUi, renderedKnownNetworksUi]);
    getDeviceList().then((deviceList) => {
      listUpdate(renderedDeviceUi, deviceList, ["Name", "Powered", "Address"]);
      screen.render();
    });

    // Get station info
    getStationList().then((stationList) => {
      listUpdate(renderedStationUi, stationList, [
        "State",
        "Scanning",
        "Frequency",
        "Security",
      ]);
      screen.render();
    });

    if (noScan) {
      return {};
    }

    // Scan for networks
    try {
      const networks = await scanNetworks();
      return networks;
    } catch (err) {
      return {};
    }
  }

  function registerKnownNetworkActions(element) {
    element.key(["d"], async function (ch, key) {
      const index = element.selected;
      const rowData = element.rows[index];
      const ssid = rowData[0]; // First column is SSID
      try {
        let networks;
        await deleteNetwork(ssid);
        for (let i = 0; i < 20; i++) {
          networks = await scan(500); // after network has a chance to settle scan network
          if (
            !networks.knownNetworks.length ||
            networks.knownNetworks.find((network) => {
              return network.connected;
            })
          ) {
            break;
          }
        }
      } catch (err) {
        reloadUiData();
      }
    });
  }

  async function scan(delay) {
    const connectingMessage = messageUi(screen, {
      top: screen.height - 1,
      left: 0,
      right: 0,
      height: "shrink",
      content: "Scanning...",
    });
    screen.render();
    if (delay) {
      await asyncTimeout(delay);
    }
    const networks = await reloadUiData();
    connectingMessage.destroy();
    screen.render();
    return networks;
  }
}
