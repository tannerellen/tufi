import reblessed from "../../external-dependencies/reblessed";
/**
 * @typedef {import('../../types/blessed.d.ts').Reblessed} Reblessed
 * @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement
 * */

/** @type {Reblessed} */
const blessed = /** @type{any} */ (reblessed);

/** @type {(options: {[key: string]: any}) => BlessedElement} */
export function containerBox(options) {
  const config = {
    left: options?.left ?? 1,
    right: options?.right ?? 1,
    height: options?.height ?? 3,
    tags: true,
    border: {
      type: "line",
    },
    style: {
      fg: "white",
      focus: {
        border: {
          fg: "green",
        },
      },
    },
  };

  if (options.top !== undefined && options.bottom !== undefined) {
    delete config.height;
  }
  const box = blessed.box({ ...config, ...options });

  blessed.text({
    parent: box,
    name: "title",
    top: -1,
    left: 0,
    height: 1,
    shrink: true,
    content: options?.title ?? "",
    padding: {
      left: 1,
      right: 1,
    },
  });
  box.on("click", () => {
    const children = box.children;
    const focusChild = children.find((/** @type {BlessedElement} */ child) => {
      return child.name.includes("focus-");
    });
    if (focusChild) {
      setImmediate(() => {
        // Wrap in setimmediate to fix timing issues with on focus and on blur
        focusChild.focus();
      });
    }
  });
  return box;
}
