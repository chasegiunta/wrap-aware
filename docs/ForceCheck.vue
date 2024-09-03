<template>
  <label class="mb-1 pl-1 text-sm text-slate-600 flex items-center gap-1.5">
    <input
      type="checkbox"
      class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
      v-model="forceWrap"
    />
    Toggle
    <span
      class="bg-slate-700 text-xs px-1 rounded py-0.5 text-yellow-200 font-mono"
    >
      data-force-wrap
    </span>
  </label>
</template>

<script setup lang="ts">
import { ref, watch, defineEmits } from "vue";
const forceWrap = ref(false);

const props = defineProps({
  container: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["toggle"]);

watch(forceWrap, (checked) => {
  const flexContainer = props.container;
  emit("toggle", checked);
});
</script>
