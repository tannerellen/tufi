import blessed from "blessed";

export function messageUi(container, options) {
  const color = options?.color ?? "blue";
  const boxConfig = {
    parent: container,
    name: options?.name ?? "",
    content: options?.content ?? "",
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
  const message = blessed.box(boxConfig);
  return message;
}
