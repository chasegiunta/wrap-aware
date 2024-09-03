# WrapAware

Minimalistic plugin to detect when flexbox children wrap! 💪

WrapAware is a lightweight, efficient JavaScript utility for detecting and responding to child wrapping in flexboxes.

### Installation

```bash
npm install wrap-aware
```

### Usage

```javascript
import WrapAware from "wrap-aware";

// Pass a single flexbox element, array of flexbox elements, or a query selector
const cleanup = WrapAware(myFlexbox);

// Returns a function to disconnect resize observer
```

```html
<!-- data-has-wrapped is applied to flexbox container when children are wrapping -->

<div data-has-wrapped class="data-[has-wrapped]:flex-column">
  <!-- data-is-wrapped is applied to wrapped items -->
  <div data-is-wrapped class="text-lg data-[is-wrapped]:text-sm">01</div>
  <div data-is-wrapped class="text-lg data-[is-wrapped]:text-sm">02</div>
  <div data-is-wrapped class="text-lg data-[is-wrapped]:text-sm">03</div>
  ...
</div>
```

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2024-present, Chase Giunta
