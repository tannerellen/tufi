import reblessed from "../../external-dependencies/reblessed";
import { getScreen } from "../screen";

/**
 * @typedef {import('../../types/blessed.d.ts').Reblessed} Reblessed
 * @typedef {import('../../types/blessed.d.ts').BlessedElement} BlessedElement
 * */

/** @type {Reblessed} */
const blessed = /** @type{any} */ (reblessed);

/** @type {(container: BlessedElement, options: {[key: string]: any}) => BlessedElement} */
export function listUi(container, options) {
  const screen = getScreen();
  // Create ListTable
  /** @type {BlessedElement} */
  const list = blessed.listtable({
    parent: container,
    name: options?.name ?? "",
    top: 0,
    bottom: 0,
    left: 0,
    width: "100%-2",
    align: "left",
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    noCellBorders: true,
    border: {
      type: "none",
    },
    scrollbar: {
      ch: " ",
      track: {
        bg: "black",
      },
      style: {
        bg: "white",
      },
    },
    style: {
      header: {
        fg: "blue",
        bold: true,
      },
      cell: {
        fg: "white",
        selected: {
          bg: options?.readOnly ? "" : "gray",
          // fg: "white",
        },
      },
      border: {
        fg: "white",
      },
    },
    data: [[""]],
  });

  list.key(["space"], async function (ch, key) {
    const index = list.selected;
    const item = list.items[index];
    list.select(index);
    screen.render();
    list.emit("select", item, index);
  });

  list.on("select", (item, index) => {
    if (index < 1) {
      // Not on an item or empty list so don't run
      return;
    }
    if (options?.onSelect) {
      options.onSelect(item, index);
    }
  });

  // Handle focus events
  list.on("focus", () => {
    list.style.cell.selected.bg = options?.readOnly ? "" : "yellow";
    container.style.border.fg = "green"; // Change border color when focused
    const titleElement = container.children.find(
      (/** @type {BlessedElement} */ child) => {
        return child.name === "title";
      },
    );
    if (titleElement) {
      titleElement.style.fg = "green";
    }
    screen.render();
  });

  list.on("blur", () => {
    list.style.cell.selected.bg = options?.readOnly ? "" : "gray";
    container.style.border.fg = ""; // Reset border color when blurred
    const titleElement = container.children.find(
      (/** @type {BlessedElement} */ child) => {
        return child.name === "title";
      },
    );
    if (titleElement) {
      titleElement.style.fg = "";
    }
    screen.render();
  });

  return list;
}

/** @type {(ui: BlessedElement, listArray: any[], headerDictionary: {label: string, key: string}[]) => void} */
export function listUpdate(ui, listArray, headerDictionary) {
  const listData = [];
  const header = headerDictionary.map((headerItem) => {
    return headerItem.label;
  });
  listData.push(header);

  for (const listItem of listArray) {
    const values = [];
    for (const headerItem of headerDictionary) {
      values.push(listItem[headerItem.key]?.toString());
    }
    // Add extra empty at the end for scrollbar fix
    values.push("");
    listData.push(values);
  }

  ui.setData(listData);
}
