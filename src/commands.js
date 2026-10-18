/**
 * @typedef {import('../types/types').StringKeyedObject} StringKeyedObject
 * @typedef {import('../types/types').FieldMap} FieldMap
 * @typedef {import('../types/types').DeviceLink} DeviceLink
 * @typedef {import('../types/types').Network} Network
 * @typedef {import('../types/types').KnownNetwork} KnownNetwork
 * @typedef {import('../types/types').WifiCredentials} WifiCredentials
 * @typedef {import('../types/types').EnterpriseOptions} EnterpriseOptions
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
      const [device, type] = parseTerseLine(line);
      if (type === "wifi") {
        return device;
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
      processCommandOutput(link, dictionary, ": ", true)
    );
  // Fix rate value
  if (Object.keys(deviceLink).length) {
    deviceLink.ssid = decodeIwSsid(deviceLink.ssid ?? "");
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
      // Lines look like AP[1].SSID:value
      const [key, value] = parseTerseLine(line);
      const property = key.slice(key.indexOf(".") + 1);
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
        const parts = parseTerseLine(line);
        if (parts[0] === "yes" || parts[0] === "*") {
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

/** @type {(rescan?: boolean) => Promise<Network[]>} */
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

    return /** @type {Network[]} */ (
      arrayFromList(wifiList, (line) => {
        return objectFromTerseLine(line, [
          { name: "ssid", type: "string" },
          { name: "security", type: "string" },
          { name: "signal", type: "number" },
          { name: "connected", type: "boolean" },
        ]);
      })
    );
  } catch (err) {
    throw err;
  }
}

/** @type {() => Promise<KnownNetwork[]>} */
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
    return /** @type {KnownNetwork[]} */ (
      arrayFromList(networks, (network) => {
        return objectFromTerseLine(network, [
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
    return connection
      .trim()
      .split("\n")
      .map((line) => parseTerseLine(line)[0]);
  } catch (err) {
    throw err;
  }
}

/**
 * Get the ssid, security type and saved password of the active wifi connection.
 * Returns undefined if no wifi connection is active.
 * @type {() => Promise<WifiCredentials | undefined>}
 */
export async function getActiveWifiCredentials() {
  const iface = await getWifiInterface();
  const uuid = await runCommand([
    "nmcli",
    "-g",
    "GENERAL.CON-UUID",
    "device",
    "show",
    iface,
  ]);
  if (!uuid) {
    return;
  }

  // Query fields individually with escaping disabled so values are returned as is
  /** @type {(field: string) => Promise<string>} */
  const getField = (field) =>
    runCommand([
      "nmcli",
      "-e",
      "no",
      "-s",
      "-g",
      field,
      "connection",
      "show",
      "uuid",
      uuid,
    ]);

  const [type, ssid, hidden, keyMgmt] = await Promise.all([
    getField("connection.type"),
    getField("802-11-wireless.ssid"),
    getField("802-11-wireless.hidden"),
    getField("802-11-wireless-security.key-mgmt"),
  ]);
  if (type !== "802-11-wireless") {
    return;
  }

  let password = "";
  if (keyMgmt === "none") {
    // WEP
    const keyIndex = (await getField("802-11-wireless-security.wep-tx-keyidx")) || "0";
    password = await getField(`802-11-wireless-security.wep-key${keyIndex}`);
  } else if (keyMgmt) {
    password = await getField("802-11-wireless-security.psk");
  }

  return {
    ssid,
    keyMgmt,
    password,
    hidden: hidden === "yes",
  };
}

// connect functions
/** @type {(ssid: string, password?: string, hidden?: boolean) => Promise<string>} */
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
  // Snapshot existing profiles so a failed attempt only cleans up what it created
  const existingUuids = new Set(await getConnectionUuids());
  try {
    return await runCommand(cmd);
  } catch (err) {
    // If connection fails then remove any profile created by this attempt.
    // Never touch profiles that existed before (saved networks).
    try {
      const newUuids = (await getConnectionUuids()).filter(
        (uuid) => !existingUuids.has(uuid),
      );
      for (const uuid of newUuids) {
        await runCommand(["nmcli", "connection", "delete", "uuid", uuid]);
      }
    } catch (cleanupErr) {
      // Ignore cleanup errors so the original connection error is reported
    }
    throw err;
  }
}

/**
 * Create and activate a WPA/WPA2/WPA3 Enterprise (802.1X) connection profile.
 * The profile is removed again if activation fails.
 * @type {(options: EnterpriseOptions) => Promise<string>}
 */
export async function connectToEnterpriseNetwork({
  ssid,
  eap,
  phase2Auth,
  identity,
  password,
  anonymousIdentity,
  domain,
}) {
  const cmd = [
    "nmcli",
    "connection",
    "add",
    "type",
    "wifi",
    "con-name",
    ssid,
    "ssid",
    ssid,
    "wifi-sec.key-mgmt",
    "wpa-eap",
    "802-1x.eap",
    eap,
    "802-1x.phase2-auth",
    phase2Auth,
    "802-1x.identity",
    identity,
    "802-1x.password",
    password,
  ];
  if (anonymousIdentity) {
    cmd.push("802-1x.anonymous-identity", anonymousIdentity);
  }
  if (domain) {
    // Validate the server certificate against system CAs and the expected domain
    cmd.push("802-1x.system-ca-certs", "yes");
    cmd.push("802-1x.domain-suffix-match", domain);
  }

  const output = await runCommand(cmd);
  // Output: Connection '<name>' (<uuid>) successfully added.
  const uuid = output.match(/\(([0-9a-f-]{36})\)/i)?.[1];
  if (!uuid) {
    throw new Error("Unable to create connection profile");
  }

  try {
    return await runCommand(["nmcli", "connection", "up", "uuid", uuid]);
  } catch (err) {
    try {
      await runCommand(["nmcli", "connection", "delete", "uuid", uuid]);
    } catch (cleanupErr) {
      // Ignore cleanup errors so the original connection error is reported
    }
    throw err;
  }
}

/**
 * Activate an existing saved connection profile
 * @type {(name: string) => Promise<string>}
 */
export async function activateConnection(name) {
  return await runCommand(["nmcli", "connection", "up", "id", name]);
}

/** @type {() => Promise<string[]>} */
async function getConnectionUuids() {
  const output = await runCommand(["nmcli", "-g", "UUID", "connection", "show"]);
  return output ? output.split("\n") : [];
}

/** @type {(ssid: string) => Promise<void>} */
export async function deleteNetworkConnection(ssid) {
  try {
    await runCommand(["nmcli", "connection", "delete", "id", ssid]);
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

/**
 * Split a line of nmcli terse (-t / -g) output into fields.
 * nmcli escapes ":" as "\:" and "\" as "\\" inside values, so a plain
 * split(":") breaks on values like ssids that contain a colon.
 * @type {(line: string) => string[]}
 */
export function parseTerseLine(line) {
  /** @type {string[]} */
  const fields = [];
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\\" && i + 1 < line.length) {
      current += line[++i];
    } else if (ch === ":") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Decode an ssid printed by `iw`, which escapes "\", leading/trailing spaces
 * and any non printable byte (including UTF-8 multibyte chars) as \xNN
 * @type {(ssid: string) => string}
 */
export function decodeIwSsid(ssid) {
  if (!ssid.includes("\\x")) {
    return ssid;
  }
  /** @type {number[]} */
  const bytes = [];
  for (let i = 0; i < ssid.length; i++) {
    const hex = ssid.slice(i + 2, i + 4);
    if (ssid[i] === "\\" && ssid[i + 1] === "x" && /^[0-9a-f]{2}$/i.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 3;
    } else {
      bytes.push(...new TextEncoder().encode(ssid[i]));
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/** @typedef {{name: string, type: 'string' | 'number' | 'boolean'}} Label */
/** @type {(input: string, labels: Label[]) => {[key: string]: string | number | boolean}} */
function objectFromTerseLine(input, labels) {
  const inputParts = parseTerseLine(input);
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

/**
 * @type {(commandOutput: string, fieldMap: FieldMap, fieldSeperator: string, splitOnce?: boolean) => {[key: string]: string | number | boolean}}
 * splitOnce: only split on the first separator so values may contain it (e.g. ssids)
 */
function processCommandOutput(
  commandOutput,
  fieldMap,
  fieldSeperator,
  splitOnce,
) {
  /** @type {{[key: string]: string | number | boolean}} */
  const result = {};
  const lines = commandOutput.trim().split("\n");
  for (const line of lines) {
    let property;
    let value;
    if (splitOnce) {
      const trimmed = line.trimStart();
      const index = trimmed.indexOf(fieldSeperator);
      if (index === -1) {
        continue;
      }
      property = trimmed.slice(0, index);
      value = trimmed.slice(index + fieldSeperator.length);
    } else {
      [property, value] = line.trim().split(fieldSeperator);
    }

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
  const message = errorMessage.includes("Error: ")
    ? errorMessage.split("Error: ")[1]
    : errorMessage;
  // Drop nmcli "Hint: use journalctl ..." lines, they don't fit in the ui
  return message
    .split("\n")
    .filter((line) => !line.trim().startsWith("Hint:"))
    .join("\n")
    .trim();
}
