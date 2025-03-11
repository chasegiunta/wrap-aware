// Constants for data attributes
const PARENT_WRAPPING_ATTR = "data-has-wrapped";
const ITEM_WRAPPED_ATTR = "data-is-wrapped";

/**
 * Gets the bounding client rect with rounded values.
 * Rounding is used to account for sub-pixel discrepancies.
 * @param item - The HTML element to get positions for
 * @returns The rounded values of key positions
 */
const getRect = (item: HTMLElement) => {
  const rect = item.getBoundingClientRect();
  return {
    top: Math.round(rect.top),
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
  };
};

/**
 * Marks the flex container and its items based on their wrap state.
 * This function is called whenever the flex container's size changes.
 * @param flexBox - The flex container element
 */
const markFlexboxAndItemsWrapState = (flexBox: HTMLElement) => {
  // Use requestAnimationFrame for performance optimization
  requestAnimationFrame(() => {
    const flexItems = Array.from(flexBox.children) as HTMLElement[];

    // Skip if there are no flex items
    if (flexItems.length === 0) {
      return;
    }

    // Get the computed style to check for flex-wrap: wrap-reverse
    const computedStyle = window.getComputedStyle(flexBox);
    const isWrapReverse = computedStyle.flexWrap === "wrap-reverse";
    const isRowDirection = computedStyle.flexDirection.includes("row");

    // Store original styles
    const originalStyle = flexBox.getAttribute("style") || "";

    // For standard wrapping (not wrap-reverse), use the original logic which works well
    if (!isWrapReverse) {
      // Temporarily set flex-direction to row for accurate calculations
      flexBox.setAttribute("style", `${originalStyle}; flex-direction: row;`);

      const firstItemTop = getRect(flexItems[0]).top;
      const lastItemTop = getRect(flexItems[flexItems.length - 1]).top;

      // Process each flex item for standard wrapping
      for (const flexItem of flexItems) {
        const isItemWrapped = firstItemTop < getRect(flexItem).top;
        const isSwitchedBoxWrapped =
          flexBox.dataset.forceWrap !== undefined && firstItemTop < lastItemTop;

        if (isItemWrapped || isSwitchedBoxWrapped) {
          flexItem.setAttribute(ITEM_WRAPPED_ATTR, "");
        } else {
          flexItem.removeAttribute(ITEM_WRAPPED_ATTR);
        }
      }

      // Remove temporary style
      if (originalStyle) {
        flexBox.setAttribute("style", originalStyle);
      } else {
        flexBox.removeAttribute("style");
      }

      // Process the flex container itself for standard wrapping
      if (firstItemTop >= lastItemTop) {
        flexBox.removeAttribute(PARENT_WRAPPING_ATTR);
      } else {
        flexBox.setAttribute(PARENT_WRAPPING_ATTR, "");
      }

      return;
    }

    // For wrap-reverse, we need a different approach specifically designed for this case

    // Set a consistent style for measurement
    flexBox.setAttribute(
      "style",
      `${originalStyle}; flex-direction: row; flex-wrap: wrap-reverse;`
    );

    // Group items based on their bottom position (in wrap-reverse, items in the same row have the same bottom)
    const bottomPositions = new Map<number, HTMLElement[]>();

    // Process each flex item and group by bottom position (with a small tolerance for rounding)
    const tolerance = 1; // 1px tolerance

    for (const flexItem of flexItems) {
      const itemRect = getRect(flexItem);

      // Find if there's already a group with a similar bottom position
      let foundGroup = false;
      for (const [bottom, items] of bottomPositions.entries()) {
        if (Math.abs(bottom - itemRect.bottom) <= tolerance) {
          items.push(flexItem);
          foundGroup = true;
          break;
        }
      }

      // If no matching group was found, create a new one
      if (!foundGroup) {
        bottomPositions.set(itemRect.bottom, [flexItem]);
      }
    }

    // Sort bottom positions from highest (visually top in wrap-reverse) to lowest
    const sortedBottoms = Array.from(bottomPositions.keys()).sort(
      (a, b) => b - a
    );

    // The first row in wrap-reverse has the highest bottom value
    if (sortedBottoms.length > 0) {
      const topRowBottom = sortedBottoms[0];

      // Mark items that are not in the first row as wrapped
      for (const flexItem of flexItems) {
        const itemBottom = getRect(flexItem).bottom;
        if (Math.abs(itemBottom - topRowBottom) > tolerance) {
          // This item is in a wrapped row
          flexItem.setAttribute(ITEM_WRAPPED_ATTR, "");
        } else {
          // This item is in the first row
          flexItem.removeAttribute(ITEM_WRAPPED_ATTR);
        }
      }
    }

    // Restore original style
    if (originalStyle) {
      flexBox.setAttribute("style", originalStyle);
    } else {
      flexBox.removeAttribute("style");
    }

    // Mark the container based on whether there's more than one row
    const hasWrapped = bottomPositions.size > 1;

    if (hasWrapped) {
      flexBox.setAttribute(PARENT_WRAPPING_ATTR, "");
    } else {
      flexBox.removeAttribute(PARENT_WRAPPING_ATTR);
    }
  });
};

type FlexContainerInput = HTMLElement | HTMLElement[] | string;

/**
 * Initializes the flex wrapping functionality for the given elements.
 * @param input - An HTMLElement, array of HTMLElements, or a CSS selector string
 * @returns A function to destroy the observers
 */
const init = (input: FlexContainerInput): (() => void) => {
  ("use strict");

  let flexBoxes: HTMLElement[];

  if (typeof input === "string") {
    // If input is a string, treat it as a CSS selector
    flexBoxes = Array.from(document.querySelectorAll(input));
  } else if (input instanceof HTMLElement) {
    // If input is a single HTMLElement
    flexBoxes = [input];
  } else if (Array.isArray(input)) {
    // If input is an array of HTMLElements
    flexBoxes = input;
  } else {
    throw new Error(
      "Invalid input type. Expected HTMLElement, HTMLElement[], or string."
    );
  }

  const observers: ResizeObserver[] = [];

  // Process each flex container
  for (const flexBox of flexBoxes) {
    markFlexboxAndItemsWrapState(flexBox);

    // Set up a ResizeObserver to watch for size changes
    const observer = new ResizeObserver((entries) =>
      entries.forEach((entry) =>
        markFlexboxAndItemsWrapState(entry.target as HTMLElement)
      )
    );
    observer.observe(flexBox);
    observers.push(observer);
  }

  // Return a function to destroy the observers
  return () => {
    observers.forEach((observer) => observer.disconnect());
  };
};

export default init;
