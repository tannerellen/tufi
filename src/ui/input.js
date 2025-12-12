import reblessed from "../../external-dependencies/reblessed";
/**
 * @typedef {import('../../types/blessed.d.ts').Reblessed} Reblessed
 * @typedef {import('../..//types/blessed.d.ts').BlessedElement} BlessedElement
 * */

/** @type {Reblessed} */
const blessed = /** @type{any} */ (reblessed);

/** @type {(container: BlessedElement, options: {[key: string]: any}) => BlessedElement} */
export function inputUi(container, options) {
  // Add password label
  const inputLabel = blessed.text({
    parent: container,
    top: options?.top ?? 0,
    left: 0,
    height: 1,
    content: options?.label ?? "Input",
    style: {
      fg: "blue",
    },
  });

  // Add input textbox
  const input = blessed.textbox({
    parent: container,
    name: options?.name || "",
    top: (options?.top ?? 0) + inputLabel.height,
    left: 0,
    right: 0,
    height: 3,
    inputOnFocus: true,
    censor: !!options?.censor, // This hides the password input
    censorChar: "•",
    border: {
      type: "line",
    },
    style: {
      fg: "white",
      border: {
        fg: "gray",
      },
      focus: {
        border: {
          fg: "blue",
        },
      },
    },
  });
  return input;
}
