import blessed from "../../external-dependencies/reblessed";
import { getScreen } from "../screen";

export function listUi(container, options) {
  const screen = getScreen();
  // Create ListTable
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
    container.children.find((child) => {
      return child.name === "title";
    }).style.fg = "green";
    screen.render();
  });

  list.on("blur", () => {
    list.style.cell.selected.bg = options?.readOnly ? "" : "gray";
    container.style.border.fg = ""; // Reset border color when blurred
    container.children.find((child) => {
      return child.name === "title";
    }).style.fg = "";
    screen.render();
  });

  return list;
}

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
