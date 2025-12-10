import reblessed from "../external-dependencies/reblessed";

/**
 * @typedef {import('../types/blessed.d.ts').Reblessed} Reblessed
 * @typedef {import('../types/blessed.d.ts').Screen} Screen
 */

/** @type {Reblessed} */
const blessed = /** @type {any} */ (reblessed);
reblessed;

/** @type {Screen} */
let currentScreen;

/** @type {() => Screen} */
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

  currentScreen = screen;
  return screen;
}

/** @type {() => Screen} */
export function getScreen() {
  return currentScreen;
}
