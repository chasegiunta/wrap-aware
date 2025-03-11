// Constants for data attributes
const PARENT_WRAPPING_ATTR = "data-has-wrapped";
const ITEM_WRAPPED_ATTR = "data-is-wrapped";

/**
 * Simple debounce implementation to limit the frequency of function calls
 * @param fn - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns A debounced function
 */
const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      fn(...args);
      timeout = null;
    }, delay);
  };
};

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
    right: Math.round(rect.right),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
};

/**
 * Check if an element already has an attribute with the expected presence state
 * @param element - The HTML element to check
 * @param attribute - The attribute name
 * @param shouldHaveAttribute - Whether the attribute should be present
 * @returns True if the element's attribute state matches the expected state
 */
const attributeStateMatches = (
  element: HTMLElement,
  attribute: string,
  shouldHaveAttribute: boolean
): boolean => {
  const hasAttribute = element.hasAttribute(attribute);
  return shouldHaveAttribute === hasAttribute;
};

/**
 * Efficiently set or remove an attribute based on condition
 * @param element - The HTML element to modify
 * @param attribute - The attribute name
 * @param shouldHaveAttribute - Whether the attribute should be present
 */
const updateAttributeEfficiently = (
  element: HTMLElement,
  attribute: string,
  shouldHaveAttribute: boolean
): void => {
  // Only update the DOM if the current state doesn't match the desired state
  if (!attributeStateMatches(element, attribute, shouldHaveAttribute)) {
    if (shouldHaveAttribute) {
      element.setAttribute(attribute, "");
    } else {
      element.removeAttribute(attribute);
    }
  }
};

// Cache to store previous measurements for elements
const measurementCache = new WeakMap<HTMLElement, string>();

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

    // Check if measurements have already been cached and dimensions haven't changed
    const dimensionKey = `${flexBox.clientWidth},${flexBox.clientHeight}`;
    const cachedKey = measurementCache.get(flexBox);

    // If the dimensions haven't changed since last measurement, skip processing
    if (cachedKey === dimensionKey) {
      return;
    }

    // Update the cache with current dimensions
    measurementCache.set(flexBox, dimensionKey);

    // Get the computed style to check for flex-wrap: wrap-reverse
    const computedStyle = window.getComputedStyle(flexBox);
    const isWrapReverse = computedStyle.flexWrap === "wrap-reverse";
    const isRowDirection = computedStyle.flexDirection.includes("row");

    // Store original styles
    const originalStyle = flexBox.getAttribute("style") || "";

    // Create a cache for the current run to avoid multiple getBoundingClientRect calls
    const rectCache = new Map<HTMLElement, ReturnType<typeof getRect>>();

    const getCachedRect = (element: HTMLElement) => {
      if (!rectCache.has(element)) {
        rectCache.set(element, getRect(element));
      }
      return rectCache.get(element)!;
    };

    // For standard wrapping (not wrap-reverse), use the original logic which works well
    if (!isWrapReverse) {
      // Temporarily set flex-direction to row for accurate calculations
      flexBox.setAttribute("style", `${originalStyle}; flex-direction: row;`);

      // Get measurements after style change in a batched way to avoid layout thrashing
      const firstItemRect = getCachedRect(flexItems[0]);
      const lastItemRect = getCachedRect(flexItems[flexItems.length - 1]);
      const firstItemTop = firstItemRect.top;
      const lastItemTop = lastItemRect.top;

      // Process each flex item for standard wrapping
      for (const flexItem of flexItems) {
        const itemRect = getCachedRect(flexItem);
        const isItemWrapped = firstItemTop < itemRect.top;
        const isSwitchedBoxWrapped =
          flexBox.dataset.forceWrap !== undefined && firstItemTop < lastItemTop;

        updateAttributeEfficiently(
          flexItem,
          ITEM_WRAPPED_ATTR,
          isItemWrapped || isSwitchedBoxWrapped
        );
      }

      // Remove temporary style
      if (originalStyle) {
        flexBox.setAttribute("style", originalStyle);
      } else {
        flexBox.removeAttribute("style");
      }

      // Process the flex container itself for standard wrapping
      updateAttributeEfficiently(
        flexBox,
        PARENT_WRAPPING_ATTR,
        !(firstItemTop >= lastItemTop)
      );

      return;
    }

    // SPECIAL HANDLING FOR FLEX-WRAP: WRAP-REVERSE
    // We'll use a fundamentally different approach:
    // 1. Normalize to row direction and specific temp styles
    // 2. Find which row each item belongs to based on top position relative to container
    // 3. Mark items based on their normalized row

    // Force a specific style for measurement that preserves wrap-reverse
    // but ensures consistent row sizing - these temporary styles won't affect
    // the final appearance but will help in detection
    flexBox.setAttribute(
      "style",
      `${originalStyle}; flex-direction: row; flex-wrap: wrap-reverse; align-items: stretch;`
    );

    // Grab the container rect after style changes
    const containerRect = getRect(flexBox);

    // For row direction, use top positions to determine rows
    // For reverse wrap, we need to look at the *relative* position from container top

    // Group items by their top position (which indicates row in wrap-reverse)
    const rowsByTopPos = new Map<number, HTMLElement[]>();
    const tolerance = 1; // 1px tolerance for rounding errors

    // Collect all item metrics at once to avoid layout thrashing
    const itemRects = flexItems.map((item) => getCachedRect(item));

    // First, collect all the unique row top positions
    for (let i = 0; i < flexItems.length; i++) {
      const itemRect = itemRects[i];
      const topPos = itemRect.top;

      // Try to find an existing row with a similar top position
      let foundRow = false;
      let matchedTop = topPos;

      for (const existingTop of rowsByTopPos.keys()) {
        if (Math.abs(existingTop - topPos) <= tolerance) {
          foundRow = true;
          matchedTop = existingTop;
          break;
        }
      }

      if (foundRow) {
        rowsByTopPos.get(matchedTop)!.push(flexItems[i]);
      } else {
        rowsByTopPos.set(topPos, [flexItems[i]]);
      }
    }

    // Sort rows by top position - in wrap-reverse, the rows at the top (smaller top values) are the wrapped ones
    // and the row at the bottom (largest top value) is the first row
    const sortedTops = Array.from(rowsByTopPos.keys()).sort((a, b) => a - b);

    // Determine if we have multiple rows
    if (sortedTops.length > 1) {
      // In wrap-reverse, the *last* row (highest top value) is the first/main row
      // Items in other rows (with smaller top values) are the wrapped ones
      const lastRowTop = sortedTops[sortedTops.length - 1];

      for (let i = 0; i < flexItems.length; i++) {
        const item = flexItems[i];
        const itemTop = itemRects[i].top;

        // Check if this item is in the last row (which is the first/main row visually at the bottom)
        const isInLastRow = Math.abs(itemTop - lastRowTop) <= tolerance;

        // Items NOT in the last row are the wrapped ones (they appear at the top in wrap-reverse)
        updateAttributeEfficiently(item, ITEM_WRAPPED_ATTR, !isInLastRow);
      }
    } else {
      // No wrapping detected, ensure no items are marked
      for (const item of flexItems) {
        updateAttributeEfficiently(item, ITEM_WRAPPED_ATTR, false);
      }
    }

    // Restore original style
    if (originalStyle) {
      flexBox.setAttribute("style", originalStyle);
    } else {
      flexBox.removeAttribute("style");
    }

    // Mark the container based on whether we detected multiple rows
    const hasWrapped = sortedTops.length > 1;
    updateAttributeEfficiently(flexBox, PARENT_WRAPPING_ATTR, hasWrapped);
  });
};

// Create a debounced version of the marking function to reduce frequency of updates
const debouncedMarkFlexboxAndItemsWrapState = debounce(
  markFlexboxAndItemsWrapState,
  16
); // ~60fps

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
    // Do the initial marking without debouncing
    markFlexboxAndItemsWrapState(flexBox);

    // Set up a ResizeObserver to watch for size changes
    const observer = new ResizeObserver((entries) =>
      entries.forEach((entry) =>
        debouncedMarkFlexboxAndItemsWrapState(entry.target as HTMLElement)
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
