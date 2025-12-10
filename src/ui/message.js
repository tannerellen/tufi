import reblessed from "../../external-dependencies/reblessed";
import { startLoader } from "./loading";

/**
 * @typedef {import('../../types/blessed.d.ts').Reblessed} Reblessed
 * @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement
 * */

/** @type {Reblessed} */
const blessed = /** @type{any} */ (reblessed);

/** @type {(container: BlessedElement, options: {[key: string]: any}) => BlessedElement} */
export function messageUi(container, options) {
  const color = options?.color ?? "blue";
  /** @type {{[key: string]: any}} */
  const boxConfig = {
    parent: container,
    name: options?.name ?? "",
    content: options?.content && !options?.loader ? options.content : "",
    padding: {
      top: 0,
      right: 1,
      bottom: 0,
      left: 1,
    },
    align: "center",
    top: options?.top ?? "",
    left: options?.left ?? "",
    right: options?.right ?? "",
    height: options?.height ?? "",
    shrink: true,
    style: {
      bg: color,
      fg: "",
    },
  };

  if (options.hasOwnProperty("left")) {
    boxConfig.left = options.left;
  }
  if (options.hasOwnProperty("right")) {
    boxConfig.right = options.right;
  }
  if (options.hasOwnProperty("width")) {
    boxConfig.width = options.width;
  }

  /** @type {BlessedElement} */
  const message = blessed.box(boxConfig);

  if (options?.loader) {
    startLoader(message, options?.content);
  }
  return message;
}
