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

    // For wrap-reverse, we need a different approach specifically designed for this case

    // Set a consistent style for measurement
    flexBox.setAttribute(
      "style",
      `${originalStyle}; flex-direction: row; flex-wrap: wrap-reverse;`
    );

    // Pre-calculate all element rects in one batch to avoid layout thrashing
    for (const flexItem of flexItems) {
      getCachedRect(flexItem);
    }

    // Group items by their bottom position using a more efficient approach
    const bottomToItems = new Map<number, HTMLElement[]>();
    const tolerance = 1; // 1px tolerance

    for (const flexItem of flexItems) {
      const itemBottom = getCachedRect(flexItem).bottom;

      // Find the nearest bottom position within tolerance
      let foundGroup = false;
      let closestBottom = itemBottom;

      for (const bottom of bottomToItems.keys()) {
        if (Math.abs(bottom - itemBottom) <= tolerance) {
          closestBottom = bottom;
          foundGroup = true;
          break;
        }
      }

      if (foundGroup) {
        bottomToItems.get(closestBottom)!.push(flexItem);
      } else {
        bottomToItems.set(itemBottom, [flexItem]);
      }
    }

    // Sort bottom positions from highest to lowest
    const sortedBottoms = Array.from(bottomToItems.keys()).sort(
      (a, b) => b - a
    );

    // The first row in wrap-reverse has the highest bottom value
    if (sortedBottoms.length > 0) {
      const topRowBottom = sortedBottoms[0];

      // Mark items that are not in the first row as wrapped
      for (const flexItem of flexItems) {
        const itemBottom = getCachedRect(flexItem).bottom;
        const isInFirstRow = Math.abs(itemBottom - topRowBottom) <= tolerance;

        updateAttributeEfficiently(flexItem, ITEM_WRAPPED_ATTR, !isInFirstRow);
      }
    }

    // Restore original style
    if (originalStyle) {
      flexBox.setAttribute("style", originalStyle);
    } else {
      flexBox.removeAttribute("style");
    }

    // Mark the container based on whether there's more than one row
    const hasWrapped = bottomToItems.size > 1;

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
