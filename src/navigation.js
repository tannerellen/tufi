import { getScreen } from "./screen";

let rowStates = new Map();

export function saveRowPositions(focusableElements) {
  focusableElements.forEach((element, index) => {
    // Set default current row for list type items
    if (element.type === "list-table") {
      const rowData = element.rows[element.selected];
      const id = rowData[0]; // assuming first column is unique identifier
      rowStates.set(element, { index: element.selected, id: id }); // Starting at 1 because of header row
    }
  });
}

export function restoreRowPositions() {
  for (const [key, value] of rowStates) {
    if (!key.visible) {
      continue;
    }

    const rows = key.rows;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === value.id) {
        // Id is matched by name so navigate to that row
        key.select(i);
        return;
      }
    }
    // If no matching id is found keep it in the same position
    key.select(value.index);
  }
}

export function getRowPosition(element) {
  return rowStates.get(element);
}

export function registerNavigation(focusableElements, onEnter, onEscape) {
  const screen = getScreen();
  let currentFocusIndex = 0;

  // Add key handlers to each focusable element
  focusableElements.forEach((element, index) => {
    // Handle tab and arrow keys on each element
    element.key(["tab"], (ch, key) => {
      focusNext();
    });

    element.key(["S-tab"], (ch, key) => {
      focusPrev();
    });

    element.key(["escape"], (ch, key) => {
      if (onEscape) {
        onEscape(element, key);
      }
    });

    element.key(["enter"], (ch, key) => {
      if (onEnter) {
        onEnter(element, key);
      }
    });
    // Track which element is focused
    element.on("focus", () => {
      currentFocusIndex = index;
    });
  });

  // Helper function to focus element
  function focusElement(index) {
    currentFocusIndex = index;
    focusableElements[currentFocusIndex].focus();
    screen.render();
  }
  // Helper function to move focus forward
  function focusNext() {
    focusElement((currentFocusIndex + 1) % focusableElements.length);
  }

  // Helper function to move focus backward
  function focusPrev() {
    focusElement(
      (currentFocusIndex - 1 + focusableElements.length) %
        focusableElements.length,
    );
  }
}
