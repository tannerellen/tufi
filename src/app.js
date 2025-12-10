import { createScreen } from "./screen";
import { asyncTimeout } from "./utils/utils";
import { containerBox } from "./ui/layout";
import { listUi, listUpdate } from "./ui/listTable";
import { getDeviceList } from "./modules/device";
import {
  registerConnectionUi,
  checkActiveConnection,
  removeActiveConnection,
} from "./modules/connection";
import {
  registerNetworkUi,
  scanNetworks,
  deleteNetwork,
  toggleWifiConnection,
} from "./modules/network";
import { togglePower } from "./modules/device";
import { connectWifi } from "./modules/wifi-dialog";
import { registerNavigation, saveRowPositions } from "./navigation";
import { messageUi } from "./ui/message";
import { startLoader } from "./ui/loading";

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

  // connection
  const connectionContainer = containerBox({
    title: "Connection",
    top: deviceContainer.height,
    height: 6,
  });
  screen.append(connectionContainer);
  const renderedConnectionUi = listUi(connectionContainer, {
    name: "focus-connection",
    readOnly: true,
  });

  // known networks
  const knownNetworksContainer = containerBox({
    title: "Known Networks",
    top: deviceContainer.height + connectionContainer.height,
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
      connectionContainer.height +
      knownNetworksContainer.height,
    height: "shrink",
  });
  screen.append(allNetworksContainer);
  const renderedNetworksUi = listUi(allNetworksContainer, {
    name: "focus-all-networks",
    onSelect: (item, index) => {
      const rowData = renderedNetworksUi.rows[index];
      const ssid = rowData[0]; // First column is SSID
      const security = rowData[1];
      screen.children.forEach((element) => {
        element.hide();
      });
      connectWifi(screen, ssid, security, (submitted) => {
        screen.children.forEach((element) => {
          element.show();
          reloadUiData(false, !submitted);
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
  registerConnectionUi(renderedConnectionUi);

  renderedNetworksUi.focus();

  // Register navigation keys
  registerNavigation(screen, [renderedNetworksUi, renderedKnownNetworksUi]);

  // App level keys. Todo: Should these just be assigned to our network list elements?
  // Connect to hidden network
  screen.key(["h"], async (ch, key) => {
    screen.children.forEach((element) => {
      element.hide();
    });
    connectWifi(screen, "", "unknown", (submitted) => {
      screen.children.forEach((element) => {
        element.show();
        reloadUiData(false, !submitted);
        renderedNetworksUi.focus();
        screen.render();
      });
    });
  });

  // Turn off wifi power
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

  // Populate ui with data
  const loader = startLoader(renderedNetworksUi, "Getting networks...");
  await reloadUiData();
  // Stop loader
  loader();

  // Run a timer for ui updates
  // updateTimer(15); // Disabled for now, maybe a keybind to start autoscan?

  function updateTimer(seconds) {
    setTimeout(() => {
      reloadUiData();
      updateTimer(seconds);
    }, 1000 * seconds);
  }

  // Private functions
  async function reloadUiData(rescan, noScan) {
    saveRowPositions([renderedNetworksUi, renderedKnownNetworksUi]);

    getDeviceList().then((deviceList) => {
      listUpdate(renderedDeviceUi, deviceList, [
        { label: "Name", key: "iface" },
        { label: "Powered", key: "stationStatus" },
        { label: "Address", key: "macAddress" },
      ]);
      screen.render();
    });

    // Get connection info
    checkActiveConnection();

    if (noScan) {
      return {};
    }

    // Scan for networks
    try {
      const networks = await scanNetworks(rescan);
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
      const connected = rowData[3];
      try {
        let networks;
        await deleteNetwork(ssid);
        if (connected) {
          await removeActiveConnection();
        }
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

  /** @type {(delay: number) => Promise<>} */
  async function scan(delay) {
    const connectingMessage = messageUi(screen, {
      top: screen.height - 1,
      left: 0,
      right: 0,
      height: "shrink",
      content: "Scanning...",
      loader: true,
    });
    screen.render();
    if (delay) {
      await asyncTimeout(delay);
    }
    const networks = await reloadUiData(true);
    connectingMessage.destroy();
    screen.render();
    return networks;
  }
}
