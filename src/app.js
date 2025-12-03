import { createScreen } from "./screen";
import { containerBox } from "./ui/layout";
import { listUi, listUpdate } from "./ui/listTable";
import { getDeviceList } from "./modules/device";
import { getStationList } from "./modules/station";
import { generateNetworkLists } from "./modules/network";
import { connectWifi } from "./modules/wifi-dialog";
import {
  registerNavigation,
  getRowPosition,
  saveRowPositions,
  restoreRowPositions,
} from "./navigation";

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

  // Register navigation keys
  registerNavigation([renderedNetworksUi, renderedKnownNetworksUi]);

  function reloadUiData() {
    saveRowPositions([renderedNetworksUi, renderedKnownNetworksUi]);
    getDeviceList().then((deviceList) => {
      listUpdate(renderedDeviceUi, deviceList, ["Name", "Powered", "Address"]);
      screen.render();
    });

    // station
    getStationList().then((stationList) => {
      listUpdate(renderedStationUi, stationList, [
        "State",
        "Scanning",
        "Frequency",
        "Security",
      ]);
      screen.render();
    });

    // network
    generateNetworkLists()
      .then((networkLists) => {
        networks = networkLists;
        listUpdate(renderedKnownNetworksUi, networkLists.knownNetworks, [
          "Name",
          "Security",
          "Signal",
          "Connected",
        ]);
        const allNetworkRow = getRowPosition(renderedNetworksUi);
        listUpdate(renderedNetworksUi, networkLists.allNetworks, [
          "Name",
          "Security",
          "Signal",
        ]);
        renderedNetworksUi.focus();
        restoreRowPositions();
        screen.render();
      })
      .catch((err) => {
        console.log("err", err);
      });
  }
}
