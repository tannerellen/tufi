import { getScreen } from "../screen.js";
import { connectToNetwork } from "../commands.js";
import { formUi } from "../ui/form.js";
import { inputUi } from "../ui/input.js";
import { buttonUi } from "../ui/button.js";
import { messageUi } from "../ui/message.js";
import { registerNavigation } from "../navigation.js";

export function connectWifi(container, ssid, security, onDestroy) {
  const screen = getScreen();
  let errorMessage;
  let top = 0;

  const showPassword = !!security;
  // Create a form box
  const form = formUi(container, {
    title: `Connect: ${ssid ? ssid : "hidden"}`,
    width: "shrink",
    height: ssid ? 13 : 17,
  });

  let ssidInput;
  if (!ssid) {
    top = top + 2;
    ssidInput = inputUi(form, {
      name: "ssid",
      label: "SSID",
      top: top,
    });
    top = top + 2;
  }

  top = top + 2;
  const passwordInput = inputUi(form, {
    name: "password",
    label: showPassword ? "Password" : "No password required",
    top: top,
    censor: true,
  });

  top = top + 6;
  // Add Connect button
  const connectButton = buttonUi(form, {
    name: "connect",
    content: "Connect",
    top: top,
    right: 1,
    width: 10,
    color: "green",
  });

  // Add Cancel button
  const cancelButton = buttonUi(form, {
    name: "cancel",
    content: "Cancel",
    top: top,
    right: 12,
    width: 10,
    color: "red",
  });

  // Focus the input
  form.focusNext();

  // Store focusable elements in order
  const focusableElements = [passwordInput, connectButton, cancelButton];
  if (ssidInput) {
    focusableElements.unshift(ssidInput);
  }

  registerNavigation(
    form,
    focusableElements,
    (element) => {
      if (element === cancelButton) {
        destroy();
      } else {
        form.submit();
      }
    },
    () => {
      destroy();
    },
  );

  // Handle form submission
  form.on("submit", async (data) => {
    if (errorMessage) {
      errorMessage.destroy();
    }
    connectButton.hide();
    cancelButton.hide();
    const connectingMessage = messageUi(form, {
      top: connectButton.top - 2,
      left: 0,
      right: 0,
      height: "shrink",
      content: "Attempting to connect...",
    });
    screen.render();
    try {
      const connection = await connectToNetwork(
        !!ssidInput ? data.ssid : ssid,
        data.password,
        !!ssidInput,
      );
      destroy(true);
    } catch (err) {
      connectingMessage.destroy();
      connectButton.show();
      cancelButton.show();
      errorMessage = messageUi(screen, {
        top: form.top + form.height,
        left: form.left,
        width: form.width,
        height: "shrink",
        content: err.message,
      });
      passwordInput.focus();
      screen.render();
    }
  });

  // Handle cancel button
  cancelButton.on("press", () => {
    // Clear form
    destroy();
  });

  function destroy(submitted) {
    if (errorMessage) {
      errorMessage.destroy();
    }
    form.destroy();
    if (onDestroy) {
      onDestroy(submitted);
    }
    screen.render();
  }
}
