import { getScreen } from "./screen";

/**
 * @typedef {import('../types/blessed.d.ts').BlessedElement} BlessedElement
 */

let rowStates = new Map();

/** @type {(focusableElements: BlessedElement[]) => void} */
export function saveRowPositions(focusableElements) {
  focusableElements.forEach((element, index) => {
    // Set default current row for list type items
    if (element.type === "list-table") {
      const rows = element.rows;
      if (!rows.length) {
        return;
      }
      const rowData = element.rows[element.selected];
      const id = rowData[0]; // assuming first column is unique identifier
      rowStates.set(element, { index: element.selected, id: id }); // Starting at 1 because of header row
    }
  });
}

/** @type {() => void} */
export function restoreRowPositions() {
  for (const [key, value] of rowStates) {
    if (!key.visible) {
      continue;
    }

    const rows = key.rows;
    if (!rows.length) {
      return;
    }
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === value.id) {
        // Id is matched by name so navigate to that row
        key.select(i);
        return;
      }
    }
    // If no matching id is found keep it in the same position
    key.select(rows.length > value.index ? value.index : 1);
  }
}

/** @type {(element: {[key: string]: any}) => Map<any, {index: number, id: string}>} */
export function getRowState(element) {
  return rowStates.get(element);
}

/** @type {(container: BlessedElement, focusableElements: BlessedElement[], onEnter?: Function, onEscape?: Function) => void} */
export function registerNavigation(
  container,
  focusableElements,
  onEnter,
  onEscape,
) {
  const screen = getScreen();
  let currentFocusIndex = 0;

  // Add key handlers to each focusable element
  focusableElements.forEach((element, index) => {
    // Handle tab and arrow keys on each element
    if (container.type !== "form") {
      element.key(["tab"], (ch, key) => {
        focusNext();
      });

      element.key(["S-tab"], (ch, key) => {
        focusPrev();
      });
    }

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

  /**
   * Helper function to focus element
   * @type {(index: number) => void} */
  function focusElement(index) {
    currentFocusIndex = index;
    focusableElements[currentFocusIndex].focus();
    screen.render();
  }

  /**
   * Helper function to move focus forward
   * @type {() => void} */
  function focusNext() {
    focusElement((currentFocusIndex + 1) % focusableElements.length);
  }

  /**
   * Helper function to move focus backward
   * @type {() => void} */
  function focusPrev() {
    focusElement(
      (currentFocusIndex - 1 + focusableElements.length) %
        focusableElements.length,
    );
  }
}
