<template>
  <div ref="codeContainer" class="overflow-hidden hidden rounded-lg mt-4"></div>
</template>

<script setup lang="ts">
import { codeToHtml } from "shiki";
import { ref, onMounted } from "vue";
import { useSlots } from "vue";

const props = defineProps({
  codeSample: {
    type: String,
    required: false,
  },
});

const codeContainer = ref();

let codeContent = props.codeSample;
codeContent = codeContent.trim();

// Wrap the async operation in a function
const applyCodeHighlighting = () => {
  codeToHtml(codeContent, {
    lang: "js",
    theme: "andromeeda",
    decorations: [
      {
        // line and character are 0-indexed
        start: { line: 0, character: 0 },
        end: { line: 7, character: 0 },
        properties: { class: "" },
      },
    ],
  })
    .then((highlightedCode) => {
      codeContainer.value.innerHTML = highlightedCode;
      codeContainer.value.classList.remove("hidden");
    })
    .catch((error) => {
      console.error("Error highlighting code:", error);
    });
};

onMounted(() => {
  applyCodeHighlighting();
});
</script>
