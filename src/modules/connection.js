import { getScreen } from "../screen";
import { getConnections } from "../commands";
import { listUpdate } from "../ui/listTable";

let connectionUi;

export function registerConnectionUi(renderedConnectionUi) {
  connectionUi = renderedConnectionUi;
}

export async function getActiveConnection() {
  const connections = await getConnections();
  const activeConnection = connections.filter((connection) => {
    return connection.connected;
  });
  return activeConnection;
}

export async function checkActiveConnection() {
  try {
    // Get connection info
    const activeConnection = await getActiveConnection();
    updateActiveConnection(activeConnection);
    return;
  } catch (err) {
    throw err;
  }
}

async function updateActiveConnection(activeConnection) {
  const screen = getScreen();
  listUpdate(connectionUi, activeConnection, [
    { label: "Name", key: "ssid" },
    { label: "Channel", key: "channel" },
    { label: "Rate", key: "rate" },
  ]);
  screen.render();
}

export async function removeActiveConnection() {
  try {
    await updateActiveConnection([]);
    return;
  } catch (err) {
    throw err;
  }
}
