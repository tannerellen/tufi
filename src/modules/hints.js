import { getScreen } from "../screen";
import { textBox, updateTextBox } from "../ui/textBox";

/** @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement */

/** @type {BlessedElement | undefined} */
let help;

const hints = ["{bold}q{/bold} quit", "{bold}?{/bold} help"];

const helpTextLines = [
  "{bold}Navigation{/bold}",
  "tab: nav | k,: up | j,: down",
  "",
  "{bold}General{/bold}",
  "s: scan | h: hidden | o: device on/off",
  "",
  "{bold}New Network{/bold}",
  "space or ↵: connect",
  "",
  "{bold}Known Network{/bold}",
  "space or ↵: connect/disconnect | d: remove",
  "",
  "{bold}Modal Dialogs{/bold}",
  "esc: close",
];

/** @type {() => BlessedElement} */
export function createHint() {
  const hint = textBox({
    bottom: 0,
    right: 1,
    height: 1,
    width: "shrink",
    // style: { fg: "blue" },
    style: { fg: "blue" },
  });
  updateTextBox(hint, hints.join(" | "));
  return hint;
}

/** @type {() => BlessedElement | undefined} */
export function showHelp() {
  const screen = getScreen();
  if (help) {
    destroy();
    return;
  }
  help = textBox({
    parent: screen,
    align: "right",
    top: /** @type {number} */ (screen.height) / 2 - 10,
    left: 3,
    right: 3,
    height: 20,
    padding: {
      top: 1,
      right: 1,
      bottom: 1,
      left: 1,
    },
    style: {
      bg: "black",
      border: {
        fg: "blue",
      },
    },
    border: {
      type: "line",
    },
  });

  // Set text content
  updateTextBox(help, helpTextLines.join("\n"));
  help.focus();
  screen.render();

  // Make sure that we don't lose focus while open
  help.on("blur", () => {
    setTimeout(() => {
      if (!help) {
        return;
      }
      help.focus();
      screen.render();
    }, 0);
  });

  // Register keys
  help.key(["escape"], (ch, key) => {
    destroy();
  });
  return help;

  /** @type {() => void} */
  function destroy() {
    if (help) {
      help.destroy();
    }
    screen.render();
    help = undefined;
  }
}
