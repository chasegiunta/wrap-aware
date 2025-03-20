// Constants for data attributes
const PARENT_WRAPPING_ATTR = "data-has-wrapped";
const ITEM_WRAPPED_ATTR = "data-is-wrapped";

// Store reference widths for containers that have been unwrapped
const containerUnwrapWidths = new WeakMap<HTMLElement, number>();

// Store active updates to prevent flickering
const activeUpdates = new WeakSet<HTMLElement>();

// Store last state to prevent unnecessary DOM updates
const lastContainerStates = new WeakMap<HTMLElement, boolean>();
const lastItemStates = new WeakMap<HTMLElement, boolean>();

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
 * Efficiently set or remove an attribute based on condition, with additional optimization
 * to prevent unnecessary DOM updates that trigger re-renders
 * @param element - The HTML element to modify
 * @param attribute - The attribute name
 * @param shouldHaveAttribute - Whether the attribute should be present
 * @param stateMap - WeakMap to track last known state for the element
 */
const updateAttributeWithMemory = (
  element: HTMLElement,
  attribute: string,
  shouldHaveAttribute: boolean,
  stateMap: WeakMap<HTMLElement, boolean>
): void => {
  // Get last known state, default to opposite of desired state
  const lastState = stateMap.get(element) ?? !shouldHaveAttribute;

  // Only update if state has changed
  if (lastState !== shouldHaveAttribute) {
    if (shouldHaveAttribute) {
      element.setAttribute(attribute, "");
    } else {
      element.removeAttribute(attribute);
    }

    // Remember new state
    stateMap.set(element, shouldHaveAttribute);
  }
};

/**
 * Get the horizontal padding of an element
 * @param element - The element to check
 * @returns The total horizontal padding in pixels
 */
const getHorizontalPadding = (element: HTMLElement): number => {
  const computedStyle = window.getComputedStyle(element);
  const paddingLeft = parseInt(computedStyle.paddingLeft, 10) || 0;
  const paddingRight = parseInt(computedStyle.paddingRight, 10) || 0;
  return paddingLeft + paddingRight;
};

/**
 * Tests if items would fit in a single line if there was no padding
 * @param flexBox - The flex container
 * @param flexItems - The flex items
 * @returns Whether items would fit without wrapping if padding was removed
 */
const wouldItemsFitWithoutPadding = (
  flexBox: HTMLElement,
  flexItems: HTMLElement[]
): boolean => {
  // Get current padding applied to the container
  const horizontalPadding = getHorizontalPadding(flexBox);

  // If there's minimal padding, no need for the check
  if (horizontalPadding <= 2) {
    return false;
  }

  // Check if we've recorded a width where items fit without wrapping
  const unwrapWidth = containerUnwrapWidths.get(flexBox);
  if (unwrapWidth) {
    // Calculate the effective size without padding
    const currentWidthWithoutPadding = flexBox.clientWidth + horizontalPadding;

    // If current width (ignoring padding) is greater than or equal
    // to the last width where items fit without wrapping
    if (currentWidthWithoutPadding >= unwrapWidth) {
      return true;
    }
  }

  return false;
};

// Cache to store previous measurements for elements
const measurementCache = new WeakMap<HTMLElement, string>();

/**
 * Collect position data for consistent wrap detection in a single pass
 * @param flexBox - Flex container element
 * @param flexItems - Array of flex items
 * @returns Information about wrapping status
 */
const collectWrappingData = (
  flexBox: HTMLElement,
  flexItems: HTMLElement[]
): { isWrapped: boolean; wrappedItems: HTMLElement[] } => {
  // If no items, nothing is wrapped
  if (flexItems.length === 0) {
    return { isWrapped: false, wrappedItems: [] };
  }

  // Store original styles
  const originalStyle = flexBox.getAttribute("style") || "";

  // Get the computed style to check for flex-wrap and direction
  const computedStyle = window.getComputedStyle(flexBox);
  const isWrapReverse = computedStyle.flexWrap === "wrap-reverse";

  // Apply temporary styles for measurement
  if (isWrapReverse) {
    // For wrap-reverse, set consistent measuring styles
    flexBox.setAttribute(
      "style",
      `${originalStyle}; flex-direction: row; flex-wrap: wrap-reverse; align-items: stretch;`
    );
  } else {
    // For standard flex-wrap, ensure row direction
    flexBox.setAttribute("style", `${originalStyle}; flex-direction: row;`);
  }

  // Get positions of all items
  const itemPositions = flexItems.map((item) => {
    const rect = getRect(item);
    return { item, top: rect.top };
  });

  // Restore original style
  if (originalStyle) {
    flexBox.setAttribute("style", originalStyle);
  } else {
    flexBox.removeAttribute("style");
  }

  // Group items by position (tolerance of 1px for sub-pixel rendering)
  const rowsByPosition = new Map<number, HTMLElement[]>();
  const tolerance = 1;

  for (const { item, top } of itemPositions) {
    // Find existing row or create new one
    let foundRow = false;
    let rowPosition = top;

    for (const position of rowsByPosition.keys()) {
      if (Math.abs(position - top) <= tolerance) {
        foundRow = true;
        rowPosition = position;
        break;
      }
    }

    if (!foundRow) {
      rowsByPosition.set(top, []);
    }

    rowsByPosition.get(rowPosition)!.push(item);
  }

  // Check if wrapping has occurred by counting rows
  const hasWrapped = rowsByPosition.size > 1;

  // Get baseline row position - differs based on wrap-reverse
  const positions = Array.from(rowsByPosition.keys()).sort((a, b) => a - b);
  const baselinePosition = isWrapReverse
    ? positions[positions.length - 1]
    : positions[0];

  // Collect wrapped items
  const wrappedItems: HTMLElement[] = [];

  for (const [position, items] of rowsByPosition.entries()) {
    if (Math.abs(position - baselinePosition) > tolerance) {
      // This is not the baseline row, items are wrapped
      wrappedItems.push(...items);
    }
  }

  return { isWrapped: hasWrapped, wrappedItems };
};

// Cache for container dimensions to prevent unnecessary recalculation
const dimensionCache = new WeakMap<HTMLElement, string>();

/**
 * Marks the flex container and its items based on their wrap state.
 * This function is called whenever the flex container's size changes.
 * @param flexBox - The flex container element
 */
const markFlexboxAndItemsWrapState = (flexBox: HTMLElement) => {
  // Skip if already processing this container
  if (activeUpdates.has(flexBox)) {
    return;
  }

  // Check for dimension changes
  const currentDimensions = `${flexBox.offsetWidth},${flexBox.offsetHeight}`;
  const lastDimensions = dimensionCache.get(flexBox);

  // Skip if dimensions haven't changed
  if (currentDimensions === lastDimensions) {
    return;
  }

  // Store new dimensions
  dimensionCache.set(flexBox, currentDimensions);

  // Mark container as being processed
  activeUpdates.add(flexBox);

  // Use requestAnimationFrame for performance optimization and visual consistency
  requestAnimationFrame(() => {
    try {
      const flexItems = Array.from(flexBox.children) as HTMLElement[];

      // Force wrapping via dataset always takes precedence
      const forceWrap = flexBox.dataset.forceWrap !== undefined;

      // Get wrapping data
      const { isWrapped: detectedWrapping, wrappedItems } = collectWrappingData(
        flexBox,
        flexItems
      );

      // Final wrapping state
      const isWrapped = forceWrap || detectedWrapping;

      // Check for unwrapping when currently wrapped with padding
      if (
        isWrapped &&
        !forceWrap &&
        flexBox.hasAttribute(PARENT_WRAPPING_ATTR)
      ) {
        const currentWidth = flexBox.offsetWidth; // Use offsetWidth which includes borders
        const unwrapWidth = containerUnwrapWidths.get(flexBox);

        // If we know an unwrap width and current width is at least that large,
        // override the wrapping state
        if (unwrapWidth && currentWidth >= unwrapWidth) {
          // Mark as unwrapped when width is sufficient
          updateAttributeWithMemory(
            flexBox,
            PARENT_WRAPPING_ATTR,
            false,
            lastContainerStates
          );

          // Clear all item wrapped attributes
          for (const item of flexItems) {
            updateAttributeWithMemory(
              item,
              ITEM_WRAPPED_ATTR,
              false,
              lastItemStates
            );
          }

          // Finish early
          return;
        }
      }

      // Update the container's wrapping attribute
      updateAttributeWithMemory(
        flexBox,
        PARENT_WRAPPING_ATTR,
        isWrapped,
        lastContainerStates
      );

      // Update item attributes
      for (const item of flexItems) {
        const isItemWrapped = isWrapped && wrappedItems.includes(item);
        updateAttributeWithMemory(
          item,
          ITEM_WRAPPED_ATTR,
          isItemWrapped,
          lastItemStates
        );
      }

      // Remember the current width if items are not wrapped
      // This is the key to handling padding correctly
      if (!isWrapped) {
        containerUnwrapWidths.set(flexBox, flexBox.offsetWidth);
      }
    } finally {
      // Always remove active marker
      activeUpdates.delete(flexBox);
    }
  });
};

// Throttle resize observations to reduce unnecessary updates
const throttle = (fn: Function, delay: number) => {
  let lastCall = 0;
  return function (...args: any[]) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};

// Throttled version for resize events (60fps)
const throttledMarkFlexboxAndItemsWrapState = throttle(
  markFlexboxAndItemsWrapState,
  16
);

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
    // Do the initial marking
    markFlexboxAndItemsWrapState(flexBox);

    // Set up a ResizeObserver to watch for size changes - use throttled callback
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        throttledMarkFlexboxAndItemsWrapState(entry.target as HTMLElement);
      }
    });

    observer.observe(flexBox);
    observers.push(observer);

    // Also observe style/class changes that might affect padding, but only
    // process if it's likely to be a meaningful change (filtering in the handler)
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Only process if it's a style or class change that might affect layout
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "style" ||
            mutation.attributeName === "class")
        ) {
          // Use setTimeout to batch multiple rapid mutations
          setTimeout(() => {
            if (!activeUpdates.has(flexBox)) {
              markFlexboxAndItemsWrapState(flexBox);
            }
          }, 0);

          break; // Only need to schedule one update
        }
      }
    });

    mutationObserver.observe(flexBox, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    // Add this observer to our list so we can disconnect it later
    observers.push(mutationObserver as unknown as ResizeObserver);
  }

  // Return a function to destroy the observers
  return () => {
    observers.forEach((observer) => observer.disconnect());
  };
};

export default init;
