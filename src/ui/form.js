import blessed from "blessed";

export function formUi(container, options) {
  const form = blessed.form({
    parent: container,
    width: options?.width ?? "",
    height: options?.height ?? "",
    left: "center",
    top: "center",
    keys: true,
    padding: {
      top: 1,
      right: 1,
      bottom: 1,
      left: 1,
    },
    border: {
      type: "line",
    },
    style: {
      border: {
        fg: "green",
      },
    },
  });

  // Add a title
  const title = blessed.text({
    parent: form,
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    content: `{bold}${options?.title || ""}{/bold}`,
    tags: true,
    style: {
      bold: true,
      fg: "green",
    },
  });
  return form;
}
