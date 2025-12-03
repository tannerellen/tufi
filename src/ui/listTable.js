import blessed from "blessed";
import { getScreen } from "../screen";

export function listUi(container, options) {
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
    style: {
      header: {
        fg: "blue",
        bold: true,
      },
      cell: {
        fg: "white",
        selected: {
          bg: options?.readOnly ? "" : "yellow",
          // fg: "white",
        },
      },
      border: {
        fg: "white",
      },
    },
    data: [["Loading..."]],
  });

  list.on("select", (item, index) => {
    if (options?.onSelect) {
      options.onSelect(item, index);
    }
  });

  // Handle focus events
  list.on("focus", () => {
    const screen = getScreen();
    container.style.border.fg = "green"; // Change border color when focused
    container.children.find((child) => {
      return child.name === "title";
    }).style.fg = "green";
  });

  list.on("blur", () => {
    const screen = getScreen();
    container.style.border.fg = ""; // Reset border color when blurred
    container.children.find((child) => {
      return child.name === "title";
    }).style.fg = "";
    screen.render();
  });

  return list;
}

export function listUpdate(ui, listArray, header) {
  const listData = [];
  listData.push(header);

  for (const listItem of listArray) {
    listData.push(Object.values(listItem));
  }

  ui.setData(listData);
}
