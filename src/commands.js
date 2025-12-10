/**
 * @typedef {import('../types/types').StringKeyedObject} StringKeyedObject
 * @typedef {import('../types/types').FieldMap} FieldMap
 * @typedef {import('../types/types').DeviceLink} DeviceLink
 * */

/** @type {() => Promise<string>} */
export async function getWifiInterface() {
  try {
    const iface = await runCommand([
      "nmcli",
      "-t",
      "-f",
      "DEVICE,TYPE",
      "device",
    ]);
    const interfaceLines = iface.split("\n");
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

/** @type {(state: string) => Promise<void>} */
export async function wifiPower(state) {
  try {
    await runCommand(["nmcli", "radio", "wifi", state]);
    return;
  } catch (err) {
    throw err;
  }
}

/** @type {(iface: string) => Promise<{[key: string]: string}[]>} */
export async function getDeviceDetail(iface) {
  try {
    const macAddress = await runCommand([
      "cat",
      `/sys/class/net/${iface}/address`,
    ]);
    const enabled = await isWifiEnabled();
    return [
      {
        iface: iface,
        stationStatus: enabled ? "On" : "Off",
        macAddress: macAddress,
      },
    ];
  } catch (err) {
    throw err;
  }
}

/** @type {() => Promise<DeviceLink>} */
export async function getDeviceLink() {
  const iface = await getWifiInterface();
  const link = await runCommand(["iw", "dev", iface, "link"]);

  /** @type {FieldMap} */
  const dictionary = new Map();
  dictionary.set("SSID", { name: "ssid", type: "string" });
  dictionary.set("freq", { name: "frequency", type: "number" });
  dictionary.set("rx bitrate", { name: "bitrate", type: "string" });

  const deviceLink =
    /** @type {{ssid: string, frequency: number, bitrate: string, rate: number, channelWidth: string, band: string, channel: number}} */ (
      processCommandOutput(link, dictionary, ": ")
    );
  // Fix rate value
  if (Object.keys(deviceLink).length) {
    const [rate, measure, width] = deviceLink.bitrate.split(" ");
    deviceLink.rate = parseFloat(rate) || 0;
    deviceLink.channelWidth = width?.replace("M", " M") || "";
    deviceLink.band = getBand(deviceLink.frequency);
    deviceLink.channel = calculateChannel(deviceLink.frequency);
  }
  return deviceLink;
}

/** @type {() => Promise<string>} */
export async function stationDump() {
  try {
    const iface = await getWifiInterface();
    const dump = await runCommand(["iw", "dev", iface, "station", "dump"]);
    return dump;
  } catch (err) {
    throw err;
  }
}

/** @type {() => Promise<StringKeyedObject>} */
export async function getDeviceInfo() {
  const iface = await getWifiInterface();
  const info = await runCommand(["iw", "dev", iface, "info"]);

  const dictionary = new Map();
  dictionary.set("addr", { name: "macAddress", type: "string" });
  dictionary.set("channel", { name: "channel", type: "string" });

  const deviceInfo = processCommandOutput(info, dictionary, " ");
  return deviceInfo;
}

/** @type {() => Promise<StringKeyedObject[]>} */
export async function getConnections() {
  try {
    const iface = await getWifiInterface();
    const connectionsOutput = await runCommand([
      "nmcli",
      "-t",
      "-f",
      "AP",
      "device",
      "show",
      iface,
    ]);
    /** @type {FieldMap} */
    const fieldMap = new Map();
    fieldMap.set("IN-USE", { name: "connected", type: "boolean" });
    fieldMap.set("SSID", { name: "ssid", type: "string" });
    fieldMap.set("MODE", { name: "mode", type: "string" });
    fieldMap.set("CHAN", { name: "channel", type: "number" });
    fieldMap.set("RATE", { name: "rate", type: "string" });
    fieldMap.set("SIGNAL", { name: "signal", type: "number" });
    fieldMap.set("BARS", { name: "bars", type: "string" });
    fieldMap.set("SECURITY", { name: "security", type: "string" });
    const connectionsLines = connectionsOutput.trim().split("\n");
    /** @type {StringKeyedObject[]} */
    const connections = [];
    /** @type {StringKeyedObject | undefined} */
    let connection;
    for (const line of connectionsLines) {
      if (!line) {
        continue;
      }
      const parts = line.split(".")[1].split(":");
      const [property, value] = parts;
      if (!fieldMap.has(property)) {
        continue;
      }
      if (!connection || property === "IN-USE") {
        connection = {};
      }

      const field = fieldMap.get(property);
      if (field) {
        connection[field.name] = stringToType(value, field.type);
      }

      if (property === "SECURITY") {
        connections.push(connection);
      }
    }
    return connections;
  } catch (err) {
    return [];
  }
}

/** @type {() => Promise<{[key: string]: string}[]>} */
export async function getStationInfo() {
  try {
    const current = await getActiveConnectionTypes();
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

/** @type {(rescan?: boolean) => Promise<{StringKeyedObject[]>} */
export async function getWifiList(rescan) {
  const command = [
    "nmcli",
    "-t",
    "-f",
    "SSID,SECURITY,SIGNAL,IN-USE",
    "device",
    "wifi",
    "list",
  ];

  if (rescan) {
    command.push("--rescan");
    command.push("yes");
  }

  try {
    const wifiList = await runCommand(command);

    return arrayFromList(wifiList, (line) => {
      return objectFromString(line, ":", [
        { name: "ssid", type: "string" },
        { name: "security", type: "string" },
        { name: "signal", type: "number" },
        { name: "connected", type: "boolean" },
      ]);
    });
  } catch (err) {
    throw err;
  }
}

/** @type {() => Promise<StringKeyedObject[]>} */
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
    return /** @type {StringKeyedObject[]} */ (
      arrayFromList(networks, (network) => {
        return objectFromString(network, ":", [
          { name: "ssid", type: "string" },
          { name: "type", type: "string" },
        ]);
      })
    );
  } catch (err) {
    throw err;
  }
}

/** @type {() => Promise<string[]>} */
async function getActiveConnectionTypes() {
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
    return connection.trim().split("\n");
  } catch (err) {
    throw err;
  }
}

// connect functions
/** @type {(ssid: string, password: string, hidden: boolean) => Promise<string>} */
export async function connectToNetwork(ssid, password, hidden) {
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

/** @type {(ssid: string) => Promise<void>} */
export async function deleteNetworkConnection(ssid) {
  try {
    await runCommand(["nmcli", "connection", "delete", ssid]);
    return;
  } catch (err) {
    throw err;
  }
}

/** @type {(ssid: string) => Promise<void>} */
export async function disconnectFromNetwork(ssid) {
  try {
    const iface = await getWifiInterface();
    await runCommand(["nmcli", "device", "disconnect", iface]);
    return;
  } catch (err) {
    return; // Don't throw on error because it may not delete if connection doesn't exist
  }
}

/** @type {() => Promise<boolean>} */
export async function isWifiEnabled() {
  try {
    const enabled = await runCommand(["nmcli", "radio", "wifi"]);
    return enabled === "enabled";
  } catch (err) {
    throw err;
  }
}

// util functions
/**
 * @type {(value: string, type: 'string' | 'number' | 'boolean') => string | number | boolean}
 */
function stringToType(value, type) {
  if (type === "number") {
    return Number(value);
  } else if (type === "boolean") {
    return Boolean(value?.trim() && value !== "false");
  } else {
    return value;
  }
}

/** @typedef {{name: string, type: 'string' | 'number' | 'boolean'}} Label */
/** @type {(input: string, separator: string, labels: Label[]) => {[key: string]: string | number | boolean}} */
function objectFromString(input, separator, labels) {
  const inputParts = input.split(separator);
  /** @type {{[key: string]: string | number | boolean}} */
  const output = {};
  for (let i = 0; i < labels.length; i++) {
    output[labels[i].name] = stringToType(inputParts[i], labels[i].type);
  }
  return output;
}

/**
 * Convert return separated list from command output to an array
 * @type {<T>(list: string, lineMutateFn?: (line: string) => T) => (string | T)[]} */
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

/**
 * Calculate channel number from frequency
 * @type {(frequency: number) => number} */
function calculateChannel(frequency) {
  if (!frequency) return 0;

  // 6 GHz band (Wi-Fi 6E)
  if (frequency >= 5925 && frequency <= 7125) {
    return Math.floor((frequency - 5950) / 5);
  }

  // 5 GHz band
  if (frequency >= 5170 && frequency <= 5825) {
    return Math.floor((frequency - 5000) / 5);
  }

  // 2.4 GHz band
  if (frequency >= 2412 && frequency <= 2472) {
    return Math.floor((frequency - 2407) / 5);
  }

  // Channel 14 (2.4 GHz)
  if (frequency === 2484) {
    return 14;
  }

  return 0;
}

/** @type {(frequency: number) => string} */
function getBand(frequency) {
  if (!frequency) {
    return "Unknown";
  }
  if (frequency >= 5925) {
    return "6 GHz";
  }
  if (frequency >= 5170) {
    return "5 GHz";
  }
  if (frequency >= 2412) {
    return "2.4 GHz";
  }
  return "Unknown";
}

/** @type {(commandOutput: string, fieldMap: FieldMap, fieldSeperator: string) => {[key: string]: string | number | boolean}} */
function processCommandOutput(commandOutput, fieldMap, fieldSeperator) {
  /** @type {{[key: string]: string | number | boolean}} */
  const result = {};
  const lines = commandOutput.trim().split("\n");
  for (const line of lines) {
    const parts = line.trim().split(fieldSeperator);
    const [property, value] = parts;

    if (!fieldMap.has(property)) {
      continue;
    }

    const field = fieldMap.get(property);
    if (field) {
      result[field.name] = stringToType(value, field.type);
    }
  }
  return result;
}

/** @type {(command: string[]) => Promise<string>} */
async function runCommand(command) {
  try {
    const proc = Bun.spawn(command, {
      stdout: "pipe", // Explicitly pipe stdout
      stderr: "pipe", // Explicitly pipe stderr
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
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

/** @type {(errorMessage: string) => string} */
function commandErrorToString(errorMessage) {
  if (errorMessage.includes("Error: ")) {
    return errorMessage.split("Error: ")[1].trim();
  } else {
    return errorMessage.trim();
  }
}
