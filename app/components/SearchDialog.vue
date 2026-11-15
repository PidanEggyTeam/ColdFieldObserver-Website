<script setup lang="ts">
import { watch } from 'vue';
import SearchBox from './SearchBox.vue';
import SearchResults from './SearchResults.vue';
import {
  clearSearchKeyword,
  closeSearchDialog,
  restoreSearchDialogFocus,
  searchDialogOpen,
} from '~/composables/useSearch';

// ============================================================
// 全站搜索弹窗（Nuxt UI 的 UModal）
//   焦点陷阱 / ESC / 遮罩点击 / 滚动锁都由 UModal 负责，
//   开合动画直接复用 Nuxt UI 的模态过渡（与 PidanUI 官网搜索弹窗一致）。
//   这里只保留两件业务事：关闭后清空关键词、把焦点还给触发元素。
//   弹窗由 v-model:open 受控（没有 UModal 触发源），因此关闭后用
//   restoreSearchDialogFocus 兜底聚焦回 opener（无 opener 时为空操作）。
// ============================================================
watch(searchDialogOpen, (open) => {
  if (open) return;
  clearSearchKeyword();
  // UModal 关闭有离场过渡；下一帧再兜底聚焦一次，避免焦点落在已卸载的内容上。
  requestAnimationFrame(restoreSearchDialogFocus);
});

/**
 * 点结果里的文章 → 先收起弹窗再跳转。
 *
 * 不要用具体类名判断：PostCard 的根节点类名会随样式重构变化，
 * 结果区域里只有「文章链接」这一种可点元素，因此任何带 href 的链接都视为命中。
 */
function onResultClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest('a[href]')) closeSearchDialog();
}

// 兜底：无论以何种方式发生路由跳转（结果链接、键盘回车、程序化导航），
// 只要弹窗还开着就一并收起，避免它盖在新页面上。
const route = useRoute();
watch(
  () => route.fullPath,
  () => {
    if (searchDialogOpen.value) closeSearchDialog();
  },
);
</script>

<template>
  <UModal
    v-model:open="searchDialogOpen"
    title="全站检索"
    :ui="{
      content: 'w-[min(880px,calc(100vw-32px))] max-w-none rounded-2xl',
      header: 'px-5 py-3.5',
      body: 'px-5 py-4',
    }"
  >
    <template #body>
      <SearchBox autofocus />
      <!-- overscroll-contain：弹窗内容滚到底时不要穿透到背后页面 -->
      <div
        class="max-h-[min(58vh,560px)] overflow-y-auto overscroll-contain"
        @click="onResultClick"
      >
        <SearchResults />
      </div>
    </template>
  </UModal>
</template>
