import { getConnections } from "../commands";

export async function getActiveConnection() {
  const connections = await getConnections();
  const activeConnection = connections.filter((connection) => {
    return connection.connected;
  });
  return activeConnection;
}
