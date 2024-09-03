<template>
  <div
    class="mt-12 mb-10 lg:mb-10 flex flex-col gap-2 bg-white rounded-lg p-8 pt-6 shadow-lg"
  >
    <div class="flex flex-wrap gap-4 justify-between items-center">
      <h1 class="text-5xl font-bold text-slate-700">WrapAware</h1>
      <iframe
        src="https://ghbtns.com/github-btn.html?user=chasegiunta&repo=wrap-aware&type=star&count=false&size=large"
        frameborder="0"
        scrolling="0"
        width="80"
        height="30"
        title="GitHub"
      ></iframe>
    </div>
    <h2 class="text-xl text-slate-500 text-pretty mb-4">
      Minimalistic plugin to detect when flexbox children wrap! 💪
    </h2>

    <p class="text-slate-600 text-lg">
      WrapAware uses a resize observer instead of media queries, and avoids the
      need for minimum or maximum widths or complex calculations.
      <a
        href="https://ishadeed.com/article/flex-wrap-detect/"
        target="_blank"
        class="text-lg text-blue-600 hover:underline text-nowrap"
        >Do we need CSS flex-wrap detection?</a
      >
    </p>
  </div>

  <Example
    parent-classes="has-[[data-is-wrapped]]:from-pink-500/50"
    child-classes="data-[is-wrapped]:bg-pink-500 data-[is-wrapped]:border-pink-400 data-[is-wrapped]:shadow-pink-900/80"
    :code-sample="exampleOneCodeSample"
    class="mb-20"
  ></Example>

  <p class="text-base sm:text-lg font-medium">
    A common use-case is to force a flex column layout when the first child has
    wrapped:
  </p>

  <Example
    parent-classes="has-[[data-is-wrapped]]:flex-col"
    child-classes=""
    :code-sample="exampleTwoCodeSample"
    class="mb-10"
  ></Example>

  <hr class="border w-full border-slate-500 mb-4" />

  <p class="mb-6 text-slate-600">
    Created and Maintained by
    <a
      href="https://x.com/chasegiunta"
      target="_blank"
      class="text-blue-600 underline hover:text-blue-800"
      >Chase Giunta</a
    >
  </p>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Example from "./Example.vue";

const exampleOneCodeSample = ref(`
import WrapAware from "wrap-aware";

// WrapAware returns a function that can be called to remove the resize observer
// Accepts a flexbox element, array of flexbox elements, or a query selector
const cleanup = WrapAware('.flex-wrap');

// Easily target with Tailwind classes, eg. ( data-[has-wrapped] & data-[is-wrapped] )
// data-has-wrapped is applied to a flexbox when children are wrapping
<div
  data-has-wrapped
  class="flex flex-wrap data-[has-wrapped]:from-pink-500/50"
>
  // data-is-wrapped is applied to the wrapped items
  <div data-is-wrapped class="data-[is-wrapped]:bg-pink-500 data-[is-wrapped]:border-pink-400 data-[is-wrapped]:shadow-pink-900/80">01</div>
  <div data-is-wrapped class="data-[is-wrapped]:bg-pink-500 data-[is-wrapped]:border-pink-400 data-[is-wrapped]:shadow-pink-900/80">02</div>
  <div data-is-wrapped class="data-[is-wrapped]:bg-pink-500 data-[is-wrapped]:border-pink-400 data-[is-wrapped]:shadow-pink-900/80">03</div>
  ...
</div>`);

const exampleTwoCodeSample =
  ref(`// Force flex-column layout when one item wraps
// Uses :has selector, eg. 
<div
  data-has-wrapped
  class="flex flex-wrap has-[[data-is-wrapped]]:flex-col"
>
  <div>01</div>
  <div>02</div>
  <div>03</div>
  <div>04</div>
  <div data-is-wrapped>05</div>
</div>`);
</script>
