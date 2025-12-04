export async function getWifiInterface() {
  try {
    const wifiInterface = await runCommand([
      "nmcli",
      "-t",
      "-f",
      "DEVICE,TYPE",
      "device",
    ]);
    const interfaceLines = wifiInterface.split("\n");
    for (const line of interfaceLines) {
      if (line.includes(":wifi")) {
        return line.split(":")[0];
      }
    }
    return "wlan0";
  } catch (err) {
    throw err;
  }
}

export async function wifiPower(state) {
  try {
    await runCommand(["nmcli", "radio", "wifi", state]);
    return;
  } catch (err) {
    throw err;
  }
}

/** @type {(iface: string) => Promise<{[key: string], string}>} */
export async function getDeviceDetail(iface) {
  try {
    const macAddress = await runCommand([
      "cat",
      `/sys/class/net/${iface}/address`,
    ]);
    return [{ iface: iface, stationStatus: "On", macAddress: macAddress }];
  } catch (err) {
    throw err;
  }
}

/** @type {() => Promise<{[key: string], string}>} */
export async function getStationInfo() {
  try {
    const current = await getCurrentConnection();
    const stationInfo = {
      state: current ? "connected" : "disconnected",
      scanning: "false",
      frequency: "-",
      security: "-",
    };
    if (current) {
      const station = await runCommand([
        "nmcli",
        "-t",
        "-f",
        "ACTIVE,SSID,FREQ,SECURITY",
        "device",
        "wifi",
        "list",
      ]);

      const stationLines = station.split("\n");

      for (const line of stationLines) {
        if (line.includes("yes:") || line.startsWith("*:")) {
          const parts = line.split(":");
          if (parts.length >= 4) {
            stationInfo.frequency = parts[2] || "-";
            stationInfo.security = parts[3] || "-";
            break;
          }
        }
      }
    }
    return [stationInfo];
  } catch (err) {
    throw err;
  }
}

/** @type {() => Promise<{[key: string], string}[]>} */
export async function getWifiList() {
  try {
    const wifiList = await runCommand([
      "nmcli",
      "-t",
      "-f",
      "SSID,SECURITY,SIGNAL,IN-USE",
      "device",
      "wifi",
      "list",
    ]);
    return arrayFromList(wifiList, (line) => {
      return objectFromString(line, ":", [
        { name: "ssid", type: "string" },
        { name: "security", type: "string" },
        { name: "signal", type: "string" },
        { name: "connected", type: "string" },
      ]);
    });
  } catch (err) {
    throw err;
  }
}

/** @type {() => Promise<{[key: string], string}[]>} */
export async function getKnownNetworks() {
  try {
    const networks = await runCommand([
      "nmcli",
      "-t",
      "-f",
      "NAME,TYPE",
      "connection",
      "show",
    ]);
    return arrayFromList(networks, (network) => {
      return objectFromString(network, ":", [
        { name: "ssid", type: "string" },
        { name: "type", type: "string" },
      ]);
    });
  } catch (err) {
    throw err;
  }
}

// async function getStationInfo() {
//   const stationInfo = await runCommand([
//     "nmcli",
//     "-t",
//     "-f",
//     "ACTIVE,SSID,FREQ,SECURITY",
//     "device",
//     "wifi",
//     "list",
//   ]);
//   return arrayFromList(stationInfo, (station) => {
//     return objectFromString(station, ":", [
//       { name: "active", type: "string" },
//       { name: "ssid", type: "string" },
//       { name: "frequency", type: "string" },
//       { name: "security", type: "string" },
//     ]);
//   });
// }

async function getCurrentConnection() {
  try {
    const connection = await runCommand([
      "nmcli",
      "-t",
      "-f",
      "NAME",
      "connection",
      "show",
      "--active",
    ]);
    return connection.split("\n")[0] ?? "";
  } catch (err) {
    throw err;
  }
}

// connect functions
export async function connectToWifi(ssid, password, hidden = false) {
  const cmd = ["nmcli", "device", "wifi", "connect", ssid];
  if (password) {
    cmd.push("password");
    cmd.push(password);
  }
  if (hidden) {
    cmd.push("hidden");
    cmd.push("yes");
  }
  try {
    return await runCommand(cmd);
  } catch (err) {
    // If connection fails then remove connection
    await deleteNetworkConnection(ssid);
    throw err;
  }
}

export async function deleteNetworkConnection(ssid) {
  try {
    await runCommand(["nmcli", "connection", "delete", ssid]);
    return;
  } catch (err) {
    throw err;
  }
}

export async function disconnectFromNetwork(ssid) {
  try {
    const wifiInterface = await getWifiInterface();
    await runCommand(["nmcli", "device", "disconnect", wifiInterface]);
    return;
  } catch (err) {
    return; // Don't throw on error because it may not delete if connection doesn't exist
  }
}

export async function isWifiEnabled() {
  try {
    const enabled = await runCommand(["nmcli", "radio", "wifi"]);
    return enabled === "enabled";
  } catch (err) {
    throw err;
  }
}

// util functions
/** @type {(value: string, type: 'string' | 'number') => string | number} */
function stringToType(value, type) {
  if (type === "number") {
    return Number(value);
  } else {
    return value;
  }
}

/** @type {(input: string, separator: string, labels: string[]) => {[key: string], string}} */
function objectFromString(input, separator, labels) {
  const inputParts = input.split(separator);
  const output = {};
  for (let i = 0; i < labels.length; i++) {
    output[labels[i].name] = stringToType(inputParts[i], labels[i].type);
  }
  return output;
}

/** @type {(list: string[], lineMutateFn: Function) => any[]} */
function arrayFromList(list, lineMutateFn) {
  const lines = list.split("\n");
  if (!lineMutateFn) {
    return lines;
  }

  const mutatedLines = [];
  for (const line of lines) {
    mutatedLines.push(lineMutateFn(line));
  }
  return mutatedLines;
}

/** @type {(command: string[]) => Promise<string>} */
async function runCommand(command) {
  try {
    const proc = Bun.spawn(command, {
      stdout: "pipe", // Explicitly pipe stdout
      stderr: "pipe", // Explicitly pipe stderr
    });
    const [stdout, stderr] = await Promise.all([
      proc.stdout.text(),
      proc.stderr.text(),
    ]);

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(commandErrorToString(stderr));
    }
    return stdout ? stdout.trim() : stdout;
  } catch (err) {
    throw err;
  }
}

function commandErrorToString(errorMessage) {
  if (errorMessage.includes("Error: ")) {
    return errorMessage.split("Error: ")[1].trim();
  } else {
    return errorMessage.trim();
  }
}
