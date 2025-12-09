import blessed from "../external-dependencies/reblessed";

let currentScreen;

/** @type {() => Object} */
export function createScreen() {
  // Create a screen object.
  const screen = blessed.screen({
    title: "Wifi TUI",
    smartCSR: true,
    autoPadding: true,
    cursor: {
      artificial: true,
      shape: "line",
      blink: true,
      color: "", // null for default
    },
  });

  // Quit on Escape, q, or Control-C.
  screen.key(["q", "C-c"], function () {
    return process.exit(0);
  });

  // Blessed internally handles these signals:
  process.on("SIGINT", () => {
    // Clean up before exit
    console.log("sigint");
  });

  process.on("SIGTERM", () => {
    // Clean up before exit
    console.log("sigterm");
  });

  currentScreen = screen;
  return screen;
}

/** @type {() => Object} */
export function getScreen() {
  return currentScreen;
}

// function cleanup() {
//   screen.destroy();
//   return process.exit(0);
// }
