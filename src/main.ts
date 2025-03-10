// Constants for data attributes
const PARENT_WRAPPING_ATTR = "data-has-wrapped";
const ITEM_WRAPPED_ATTR = "data-is-wrapped";

/**
 * Gets the rounded top position of an element.
 * Rounding is used to account for sub-pixel discrepancies.
 * @param item - The HTML element to get the top position for
 * @returns The rounded top position of the element
 */
const getTop = (item: HTMLElement) =>
  Math.round(item.getBoundingClientRect().top);

/**
 * Marks the flex container and its items based on their wrap state.
 * This function is called whenever the flex container's size changes.
 * @param flexBox - The flex container element
 */
const markFlexboxAndItemsWrapState = (flexBox: HTMLElement) => {
  // Use requestAnimationFrame for performance optimization
  requestAnimationFrame(() => {
    const flexItems = flexBox.children;

    // Skip if there are no flex items
    if (flexItems.length === 0) {
      return;
    }

    // Get the computed style to check for flex-wrap: wrap-reverse
    const computedStyle = window.getComputedStyle(flexBox);
    const isWrapReverse = computedStyle.flexWrap === "wrap-reverse";

    // Temporarily set flex-direction to row for accurate calculations
    // but preserve the original flex-wrap setting
    flexBox.setAttribute(
      "style",
      `flex-direction: row; flex-wrap: ${computedStyle.flexWrap};`
    );

    const firstItemTop = getTop(flexItems[0] as HTMLElement);
    const lastItemTop = getTop(flexItems[flexItems.length - 1] as HTMLElement);

    // Process each flex item
    for (const flexItem of flexItems as HTMLCollectionOf<HTMLElement>) {
      // Different comparison based on wrap-reverse vs normal wrap
      const itemTop = getTop(flexItem);
      const isItemWrapped = isWrapReverse
        ? firstItemTop > itemTop // For wrap-reverse, wrapped items are above
        : firstItemTop < itemTop; // For normal wrap, wrapped items are below

      const isSwitchedBoxWrapped =
        flexBox.dataset.forceWrap !== undefined &&
        (isWrapReverse
          ? firstItemTop > lastItemTop
          : firstItemTop < lastItemTop);

      // Add or remove data attribute based on wrap state
      if (isItemWrapped || isSwitchedBoxWrapped) {
        flexItem.setAttribute(ITEM_WRAPPED_ATTR, "");
      } else {
        flexItem.removeAttribute(ITEM_WRAPPED_ATTR);
      }
    }

    // Remove temporary style
    flexBox.removeAttribute("style");

    // Process the flex container itself
    // For wrap-reverse, no wrapping means first item is below or at same level as last item
    // For normal wrap, no wrapping means first item is above or at same level as last item
    const hasWrapped = isWrapReverse
      ? firstItemTop <= lastItemTop
      : firstItemTop >= lastItemTop;

    if (hasWrapped) {
      flexBox.removeAttribute(PARENT_WRAPPING_ATTR);
    } else {
      flexBox.setAttribute(PARENT_WRAPPING_ATTR, "");
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
