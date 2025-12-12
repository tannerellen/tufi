import reblessed from "../../external-dependencies/reblessed";
/**
 * @typedef {import('../../types/blessed.d.ts').Reblessed} Reblessed
 * @typedef {import('../..//types/blessed.d.ts').BlessedElement} BlessedElement
 * */

/** @type {Reblessed} */
const blessed = /** @type{any} */ (reblessed);

/** @type {(container: BlessedElement, options: {[key: string]: any}) => BlessedElement} */
export function buttonUi(container, options) {
  const color = options?.color ?? "green";
  const button = blessed.button({
    parent: container,
    name: options?.name ?? "",
    content: options?.content ?? "",
    align: "center",
    top: options?.top ?? "",
    right: options?.right ?? "",
    width: options?.width ?? "",
    height: 1,
    style: {
      bg: color,
      fg: "",
      focus: {
        bg: `light${color}`,
        fg: "",
      },
      hover: {
        bg: `light${color}`,
        fg: "",
      },
    },
    mouse: true,
  });
  return button;
}
