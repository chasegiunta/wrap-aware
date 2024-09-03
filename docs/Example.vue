<template>
  <div>
    <div class="flex justify-end">
      <!-- <ForceCheck
        v-if="container"
        :container="container"
        @toggle="toggleForceWrap($event)"
      ></ForceCheck> -->
      <div ref="resizeInfo" class="text-right mb-1 pr-1 text-sm text-slate-600">
        Resize the container to see it in action &#10549;
      </div>
    </div>

    <div ref="container" class="flex gap-1 w-full min-h-[142px]">
      <div
        ref="resizable"
        class="resize-x max-w-full w-screen overflow-auto border border-slate-300 bg-fixed bg-grid-light bg-slate-800 shadow-inner rounded-xl"
      >
        <div
          ref="flexParent"
          class="p-10 flex flex-wrap gap-6 bg-gradient-to-t"
          :class="parentClasses"
        >
          <div
            :class="childClasses"
            class="rounded-md px-14 py-4 bg-blue-600 shadow-lg shadow-blue-900/80 border-2 border-blue-500 text-white font-medium font-mono flex-1 text-center"
          >
            01
          </div>
          <div
            :class="childClasses"
            class="rounded-md px-14 py-4 bg-blue-600 shadow-lg shadow-blue-900/80 border-2 border-blue-500 text-white font-medium font-mono flex-1 text-center"
          >
            02
          </div>
          <div
            :class="childClasses"
            class="rounded-md px-14 py-4 bg-blue-600 shadow-lg shadow-blue-900/80 border-2 border-blue-500 text-white font-medium font-mono flex-1 text-center"
          >
            03
          </div>
          <div
            :class="childClasses"
            class="rounded-md px-14 py-4 bg-blue-600 shadow-lg shadow-blue-900/80 border-2 border-blue-500 text-white font-medium font-mono flex-1 text-center"
          >
            04
          </div>
          <div
            :class="childClasses"
            class="rounded-md px-14 py-4 bg-blue-600 shadow-lg shadow-blue-900/80 border-2 border-blue-500 text-white font-medium font-mono flex-1 text-center"
          >
            05
          </div>
        </div>
      </div>

      <ResizeHandle
        v-if="resizable && container && resizeInfo"
        :resizeInfo="resizeInfo"
        :resizable="resizable"
        :container="container"
      ></ResizeHandle>
    </div>

    <Code :codeSample="props.codeSample"></Code>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import WrapAware from "../src/main";
import Code from "./Code.vue";
import ResizeHandle from "./ResizeHandle.vue";
import ForceCheck from "./ForceCheck.vue";

const props = defineProps({
  parentClasses: {
    type: String,
  },
  childClasses: {
    type: String,
  },
  codeSample: {
    type: String,
  },
});

const cleanup = ref();
const flexParent = ref();

const resizeInfo = ref();
const resizable = ref();
const container = ref();

onMounted(() => {
  cleanup.value = WrapAware(flexParent.value);
});
</script>

<style scoped></style>
