import blessed from "../../external-dependencies/reblessed";

export function inputUi(container, options) {
  // Add password label
  const inputLabel = blessed.text({
    parent: container,
    top: options?.top ?? 0,
    left: 0,
    height: 1,
    content: "Password",
    style: {
      fg: "blue",
    },
  });

  // Add input textbox
  const input = blessed.textbox({
    parent: container,
    name: options?.name || "",
    top: (options?.top ?? 0) + inputLabel.height,
    left: 0,
    right: 0,
    height: 3,
    inputOnFocus: true,
    censor: !!options?.censor, // This hides the password input
    border: {
      type: "line",
    },
    style: {
      fg: "white",
      border: {
        fg: "gray",
      },
      focus: {
        border: {
          fg: "blue",
        },
      },
    },
  });
  return input;
}
