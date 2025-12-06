import { getScreen } from "../screen.js";
import { connectToNetwork } from "../commands.js";
import { formUi } from "../ui/form.js";
import { inputUi } from "../ui/input.js";
import { buttonUi } from "../ui/button.js";
import { messageUi } from "../ui/message.js";
import { registerNavigation, focusFormInput } from "../navigation.js";

export function connectWifi(container, ssid, onDestroy) {
  const screen = getScreen();
  let errorMessage;
  // Create a form box
  const form = formUi(container, {
    title: `Connect: ${ssid}`,
    width: "shrink",
    height: 13,
  });
  const passwordInput = inputUi(form, {
    name: "password",
    top: 2,
    censor: true,
  });

  // Add Connect button
  const connectButton = buttonUi(form, {
    name: "connect",
    content: "Connect",
    top: 8,
    right: 1,
    width: 10,
    color: "green",
  });

  // Add Cancel button
  const cancelButton = buttonUi(form, {
    name: "cancel",
    content: "Cancel",
    top: 8,
    right: 12,
    width: 10,
    color: "red",
  });

  // Focus the input
  form.focusNext();

  // Store focusable elements in order
  const focusableElements = [passwordInput, connectButton, cancelButton];
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
      top: 7,
      left: 0,
      right: 0,
      height: "shrink",
      content: "Attempting to connect...",
    });
    screen.render();
    try {
      const connection = await connectToNetwork(ssid, data.password);
      destroy();
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
      focusFormInput(form, passwordInput);
      screen.render();
    }
  });

  // Handle cancel button
  cancelButton.on("press", () => {
    // Clear form
    passwordInput.setValue("");
    destroy();
  });

  function destroy() {
    if (errorMessage) {
      errorMessage.destroy();
    }
    form.destroy();
    if (onDestroy) {
      onDestroy();
    }
    screen.render();
  }
}
