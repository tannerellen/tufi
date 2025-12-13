import reblessed from "../../external-dependencies/reblessed";
/**
 * @typedef {import('../../types/blessed.d.ts').Reblessed} Reblessed
 * @typedef {import('../..//types/blessed.d.ts').BlessedElement} BlessedElement
 * */

/** @type {Reblessed} */
const blessed = /** @type{any} */ (reblessed);
//

/** @type {(options: {[key: string]: any}) => BlessedElement} */
export function textBox(options) {
  const textElement = blessed.text(options);
  return textElement;
}

/** @type {(container: BlessedElement, content: string) => void} */
export function updateTextBox(element, content) {
  element.setContent(blessed.parseTags(content));
}
