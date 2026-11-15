<script setup lang="ts">
// 覆盖 @nuxt/ui 的 ProseH3：原组件把整段标题文字包进 <a href="#id">，
// 导致「标题本身是链接」。这里改为标题文字不再是链接，只保留一个独立的
// <a href="#id">#</a> 锚点按钮（桌面 hover 显现、移动端隐藏，样式在 prose.css）。
defineProps<{ id?: string }>();
</script>

<template>
  <h3 :id="id" class="post-h">
    <a v-if="id" class="post-h-anchor" :href="`#${id}`" aria-label="本节锚点链接">#</a>
    <span class="post-h-text"><slot /></span>
  </h3>
</template>
