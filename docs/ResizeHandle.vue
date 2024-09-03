<template>
  <div
    ref="resize"
    @mousedown="handleMouseDown($event)"
    @mousemove="handleMouseMove($event)"
    @mouseup="handleMouseUp()"
    class="shrink-0 w-4 my-2 group rounded-full relative select-none cursor-col-resize bg-slate-600 border-2 border-slate-700 flex items-center justify-center"
  >
    <div
      class="w-1.5 h-4 border-x border-white opacity-80 group-hover:opacity-100 pointer-events-none"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps } from "vue";

const props = defineProps({
  resizeInfo: {
    type: Object,
    required: true,
  },
  container: {
    type: Object,
    required: true,
  },
  resizable: {
    type: Object,
    required: true,
  },
});

const isDragging = ref(false);
const startX = ref();
const startWidth = ref();

const resize = ref();

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true;
  props.resizeInfo.classList.add("transition-opacity", "opacity-0");
  startX.value = e.clientX;
  startWidth.value = props.resizable.offsetWidth;
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};

const handleMouseMove = (e) => {
  if (!isDragging.value) return;
  const deltaX = e.clientX - startX.value;
  const newWidth = Math.max(
    200,
    Math.min(startWidth.value + deltaX, props.container.offsetWidth - 10)
  );
  props.resizable.style.width = `${newWidth}px`;
};

const handleMouseUp = () => {
  isDragging.value = false;
};
</script>
