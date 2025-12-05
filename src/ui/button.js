import blessed from "../../external-dependencies/reblessed";

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
