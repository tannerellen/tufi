import { getScreen } from "../screen.js";
import { connectToEnterpriseNetwork } from "../commands.js";
import { formUi } from "../ui/form.js";
import { inputUi } from "../ui/input.js";
import { buttonUi } from "../ui/button.js";
import { textBox } from "../ui/textBox.js";
import { messageUi } from "../ui/message.js";
import { registerNavigation } from "../navigation.js";

/** @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement */
/** @typedef {import('../../types/types.d.ts').EnterpriseOptions} EnterpriseOptions */
/** @typedef {EnterpriseOptions["eap"]} Eap */
/** @typedef {EnterpriseOptions["phase2Auth"]} Phase2Auth */
/** @typedef {{value: string, label: string}} PickerOption */

/** @type {{value: Eap, label: string, phase2: {value: Phase2Auth, label: string}[]}[]} */
const EAP_METHODS = [
  {
    value: "peap",
    label: "PEAP",
    phase2: [
      { value: "mschapv2", label: "MSCHAPv2" },
      { value: "gtc", label: "GTC" },
    ],
  },
  {
    value: "ttls",
    label: "TTLS",
    phase2: [
      { value: "pap", label: "PAP" },
      { value: "mschapv2", label: "MSCHAPv2" },
    ],
  },
];

const LABEL_WIDTH = 12;

/**
 * Dialog for connecting to WPA/WPA2/WPA3 Enterprise (802.1X) networks
 * @type {(container: BlessedElement, ssid: string, onDestroy: (submitted: boolean) => void) => void}
 */
export function connectEnterpriseWifi(container, ssid, onDestroy) {
  const screen = getScreen();

  /** @type {BlessedElement | undefined} */
  let statusMessage;
  let submitting = false;
  let methodIndex = 0;
  let phase2Index = 0;

  const form = formUi(container, {
    title: `Connect: ${ssid} (Enterprise)`,
    width: 50,
    height: 27,
  });

  // Method pickers
  const methodPicker = picker(2, "Method", () => {
    methodIndex = (methodIndex + 1) % EAP_METHODS.length;
    phase2Index = 0;
    updatePickers();
  });
  const phase2Picker = picker(3, "Inner auth", () => {
    const options = EAP_METHODS[methodIndex].phase2;
    phase2Index = (phase2Index + 1) % options.length;
    updatePickers();
  });
  updatePickers();

  const identityInput = inputUi(form, { name: "identity", label: "Username", top: 4 });
  const passwordInput = inputUi(form, {
    name: "password",
    label: "Password",
    top: 8,
    censor: true,
  });
  const anonymousInput = inputUi(form, {
    name: "anonymousIdentity",
    label: "Anonymous identity (optional)",
    top: 12,
  });
  const domainInput = inputUi(form, {
    name: "domain",
    label: "Domain (optional, verifies server)",
    top: 16,
  });

  const connectButton = buttonUi(form, {
    name: "connect",
    content: "Connect",
    top: 22,
    right: 1,
    width: 10,
    color: "green",
  });
  const cancelButton = buttonUi(form, {
    name: "cancel",
    content: "Cancel",
    top: 22,
    right: 12,
    width: 10,
    color: "red",
  });

  const focusableElements = [
    methodPicker,
    phase2Picker,
    identityInput,
    passwordInput,
    anonymousInput,
    domainInput,
    connectButton,
    cancelButton,
  ];

  registerNavigation(
    form,
    focusableElements,
    (/** @type {BlessedElement} */ element) => {
      // Buttons handle enter through their press event
      if (element.type === "textbox") {
        submit();
      }
    },
    () => {
      destroy(false);
    },
  );

  // Keep the form's tab position in sync when focus is set directly (or by mouse)
  focusableElements.forEach((element) => {
    element.on("focus", () => {
      /** @type {any} */ (form)._selected = element;
    });
  });

  connectButton.on("press", () => submit());
  cancelButton.on("press", () => destroy(false));

  identityInput.focus();
  screen.render();

  /** @type {() => Promise<void>} */
  async function submit() {
    if (submitting) {
      return;
    }
    const identity = String(identityInput.value ?? "").trim();
    const password = String(passwordInput.value ?? "");
    if (!identity || !password) {
      showStatus("Username and password are required", "red");
      (identity ? passwordInput : identityInput).focus();
      screen.render();
      return;
    }

    submitting = true;
    connectButton.hide();
    cancelButton.hide();
    showStatus("Connecting...", "blue", true);

    const method = EAP_METHODS[methodIndex];
    try {
      await connectToEnterpriseNetwork({
        ssid,
        eap: method.value,
        phase2Auth: method.phase2[phase2Index].value,
        identity,
        password,
        anonymousIdentity: String(anonymousInput.value ?? "").trim(),
        domain: String(domainInput.value ?? "").trim(),
      });
      destroy(true);
    } catch (err) {
      submitting = false;
      connectButton.show();
      cancelButton.show();
      showStatus(err instanceof Error ? err.message : String(err), "red");
      passwordInput.focus();
      screen.render();
    }
  }

  /** @type {(content: string, color: string, loader?: boolean) => void} */
  function showStatus(content, color, loader) {
    if (statusMessage) {
      statusMessage.destroy();
    }
    statusMessage = messageUi(form, {
      top: 20,
      left: 0,
      right: 0,
      height: "shrink",
      content,
      color,
      loader,
    });
    screen.render();
  }

  /**
   * A label with a button that cycles through options when pressed
   * @type {(top: number, label: string, onPress: () => void) => BlessedElement}
   */
  function picker(top, label, onPress) {
    textBox({
      parent: form,
      top,
      left: 0,
      height: 1,
      content: label,
      style: { fg: "blue" },
    });
    const button = buttonUi(form, {
      top,
      left: LABEL_WIDTH,
      width: 14,
      color: "blue",
    });
    button.on("press", onPress);
    return button;
  }

  /** @type {() => void} */
  function updatePickers() {
    const method = EAP_METHODS[methodIndex];
    methodPicker.setContent(`${method.label} ›`);
    phase2Picker.setContent(`${method.phase2[phase2Index].label} ›`);
    screen.render();
  }

  /** @type {(submitted: boolean) => void} */
  function destroy(submitted) {
    form.destroy();
    if (onDestroy) {
      onDestroy(submitted);
    }
    screen.render();
  }
}
