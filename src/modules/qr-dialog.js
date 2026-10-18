import { getScreen } from "../screen";
import { textBox, updateTextBox } from "../ui/textBox";
import { messageUi } from "../ui/message";
import { getActiveWifiCredentials } from "../commands";
import { encodeQr, qrToLines } from "../utils/qrcode";

/** @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement */
/** @typedef {import('../../types/types.d.ts').WifiCredentials} WifiCredentials */

/** @type {BlessedElement | undefined} */
let qrDialog;

/**
 * Toggle a dialog with a QR code other devices can scan to join the active wifi network
 * @type {() => Promise<void>}
 */
export async function showWifiQr() {
  const screen = getScreen();
  if (qrDialog) {
    destroy();
    return;
  }

  let lines;
  /** @type {WifiCredentials | undefined} */
  let credentials;
  try {
    credentials = await getActiveWifiCredentials();
    if (!credentials) {
      throw new Error("Not connected to a wifi network");
    }
    lines = qrToLines(encodeQr(buildWifiString(credentials), "M"));
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
    return;
  }

  const header = [
    `{bold}${escapeTags(credentials.ssid)}{/bold}`,
    "Scan to join network",
    "",
  ];
  const footer = ["", "esc: close"];
  const contentLines = [...header, ...lines, ...footer];
  const width = lines[0].length + 4; // border + padding
  const height = contentLines.length + 2; // border

  if (
    width > /** @type {number} */ (screen.width) ||
    height > /** @type {number} */ (screen.height)
  ) {
    showError(`Terminal too small to show QR code (needs ${width}x${height})`);
    return;
  }

  qrDialog = textBox({
    parent: screen,
    align: "center",
    top: "center",
    left: "center",
    width,
    height,
    padding: {
      left: 1,
      right: 1,
    },
    style: {
      fg: "brightwhite",
      bg: "black",
      border: {
        fg: "blue",
        bg: "black",
      },
    },
    border: {
      type: "line",
    },
  });

  updateTextBox(qrDialog, contentLines.join("\n"));
  qrDialog.focus();
  screen.render();

  // Make sure that we don't lose focus while open
  qrDialog.on("blur", () => {
    setTimeout(() => {
      if (!qrDialog) {
        return;
      }
      qrDialog.focus();
      screen.render();
    }, 0);
  });

  qrDialog.key(["escape"], () => {
    destroy();
  });

  /** @type {() => void} */
  function destroy() {
    if (qrDialog) {
      const dialog = qrDialog;
      qrDialog = undefined;
      dialog.destroy();
    }
    screen.render();
  }
}

/**
 * Build the standard wifi QR payload: WIFI:T:<type>;S:<ssid>;P:<password>;H:<hidden>;;
 * @type {(credentials: WifiCredentials) => string}
 */
function buildWifiString({ ssid, keyMgmt, password, hidden }) {
  let type;
  switch (keyMgmt) {
    case "":
    case "owe":
      type = "nopass";
      break;
    case "none":
      type = "WEP";
      break;
    case "wpa-psk":
    case "sae":
      type = "WPA";
      break;
    default:
      throw new Error(`Sharing ${keyMgmt} networks is not supported`);
  }

  if (type !== "nopass" && !password) {
    throw new Error("Unable to read the saved password for this network");
  }

  let result = `WIFI:T:${type};S:${escapeWifiValue(ssid)};`;
  if (type !== "nopass") {
    result += `P:${escapeWifiValue(password)};`;
  }
  if (hidden) {
    result += "H:true;";
  }
  return result + ";";
}

/** @type {(value: string) => string} */
function escapeWifiValue(value) {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

/** @type {(value: string) => string} */
function escapeTags(value) {
  return value.replace(/[{}]/g, (ch) => (ch === "{" ? "{open}" : "{close}"));
}

/** @type {(content: string) => void} */
function showError(content) {
  const screen = getScreen();
  const message = messageUi(screen, {
    top: /** @type {number} */ (screen.height) - 1,
    left: 0,
    right: 0,
    height: "shrink",
    content,
    color: "red",
  });
  screen.render();
  setTimeout(() => {
    message.destroy();
    screen.render();
  }, 3000);
}
