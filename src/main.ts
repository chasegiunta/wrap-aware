// Constants for data attributes
const PARENT_WRAPPING_ATTR = "[data-has-wrapped]";
const ITEM_WRAPPED_ATTR = "[data-is-wrapped]";

/**
 * Converts a data attribute name to camelCase.
 * Removes brackets, 'data-' prefix, and converts to camelCase.
 * @param attr - The attribute name to convert
 * @returns The camelCase version of the attribute name
 */
const convertToCamelCase = (attr: string): string => {
  // Remove brackets and 'data-' prefix
  const cleanAttr = attr.replace(/^\[?data-/, "").replace(/]$/, "");

  // Convert to camelCase
  return cleanAttr.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
};

// Convert attribute names to camelCase for use with dataset
const parentWrappingAttr = convertToCamelCase(PARENT_WRAPPING_ATTR);
const itemWrappedAttr = convertToCamelCase(ITEM_WRAPPED_ATTR);

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
  requestAnimationFrame((_) => {
    const flexItems = flexBox.children;

    // Temporarily set flex-direction to row for accurate calculations
    flexBox.setAttribute("style", "flex-direction: row");

    const firstItemTop = getTop(flexItems[0] as HTMLElement);
    const lastItemTop = getTop(flexItems[flexItems.length - 1] as HTMLElement);

    // Process each flex item
    for (const flexItem of flexItems as HTMLCollectionOf<HTMLElement>) {
      if (flexItem.dataset[itemWrappedAttr] === undefined) {
        continue;
      }

      const wrappedItemClasses = flexItem.dataset[itemWrappedAttr].split(" ");

      // Check if the item has wrapped
      const isItemWrapped = firstItemTop < getTop(flexItem);
      const isSwitchedBoxWrapped =
        flexBox.dataset.forceWrap !== undefined && firstItemTop < lastItemTop;

      // Add or remove classes based on wrap state
      if (isItemWrapped || isSwitchedBoxWrapped) {
        flexItem.classList.add(...wrappedItemClasses);
      } else {
        flexItem.classList.remove(...wrappedItemClasses);
      }
    }

    // Remove temporary style
    flexBox.removeAttribute("style");

    // Process the flex container itself
    if (flexBox.dataset[parentWrappingAttr] === undefined) {
      return;
    }

    const wrappingClasses = flexBox.dataset[parentWrappingAttr].split(" ");

    // Add or remove classes on the flex container based on wrap state
    if (firstItemTop >= lastItemTop) {
      flexBox.classList.remove(...wrappingClasses);
    } else {
      flexBox.classList.add(...wrappingClasses);
    }
  });
};

/**
 * Initializes the flex wrapping functionality.
 * This function finds all relevant flex containers and sets up observers.
 */
const init = () => {
  "use strict";

  // Find flex containers with the wrapping attribute
  const markedFlexContainers = document.querySelectorAll(PARENT_WRAPPING_ATTR);

  // If none found, look for containers with wrapped items
  let flexContainers: HTMLElement[] = [];
  if (markedFlexContainers.length === 0) {
    const flexChildren = document.querySelectorAll(ITEM_WRAPPED_ATTR);
    flexContainers = Array.from(flexChildren)
      .map((child) => child.parentElement)
      .filter((parent): parent is HTMLElement => parent !== null);
  }

  // Use whichever set of containers we found
  const flexBoxes =
    markedFlexContainers.length > 0 ? markedFlexContainers : flexContainers;

  // Process each flex container
  for (const flexBox of flexBoxes) {
    markFlexboxAndItemsWrapState(flexBox as HTMLElement);

    // Set up a ResizeObserver to watch for size changes
    new ResizeObserver((entries) =>
      entries.forEach((entry) =>
        markFlexboxAndItemsWrapState(entry.target as HTMLElement)
      )
    ).observe(flexBox);
  }
};

export { init };
