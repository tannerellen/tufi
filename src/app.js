import { createScreen } from "./screen";
import { containerBox } from "./ui/layout";
import { listUi, listUpdate } from "./ui/listTable";
import { getDeviceList } from "./modules/device";
import { getStationList } from "./modules/station";
import { scanNetworks, deleteNetwork } from "./modules/network";
import { connectWifi } from "./modules/wifi-dialog";
import {
  registerNavigation,
  saveRowPositions,
  restoreRowPositions,
} from "./navigation";
import { messageUi } from "./ui/message";

export async function initialize() {
  let networks = {};
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
      connectWifi(screen, ssid, () => {
        screen.children.forEach((element) => {
          element.show();
          reloadUiData();
          renderedNetworksUi.focus();
          screen.render();
        });
      });
    },
  });

  // render to make sure we see something initially
  screen.render();

  // populate ui with data
  reloadUiData();
  renderedNetworksUi.focus();

  // Register navigation keys
  registerNavigation([renderedNetworksUi, renderedKnownNetworksUi]);

  // App level keys. Todo: Should these just be assigned to our network list elements?
  screen.key(["s"], async function (ch, key) {
    const connectingMessage = messageUi(screen, {
      top: screen.height - 1,
      left: 0,
      right: 0,
      height: "shrink",
      content: "Scanning...",
    });
    await reloadUiData();
    setTimeout(() => {
      // Run in timeout so we always see the message for a little bit at least
      connectingMessage.destroy();
      screen.render();
    }, 500);
  });

  registerKnownNetworkActions(renderedKnownNetworksUi);

  async function reloadUiData() {
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

    // Scan for networks
    networks = await scanNetworks(renderedKnownNetworksUi, renderedNetworksUi);
  }

  function registerKnownNetworkActions(element) {
    element.key(["d"], async function (ch, key) {
      const index = element.selected;
      const rowData = element.rows[index];
      const ssid = rowData[0]; // First column is SSID
      try {
        await deleteNetwork(ssid);
        reloadUiData();
      } catch (err) {
        reloadUiData();
      }
    });
  }
}
