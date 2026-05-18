<script setup lang="ts">
import { computed } from 'vue'
import {
  ChevronDoubleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  currentPage: number
  lastPage: number
  totalItems: number
  limit: number
}>()

const emit = defineEmits<{
  (e: 'update:page', page: number): void
  (e: 'update:limit', limit: number): void
}>()

const startRecord = computed(() => {
  if (props.totalItems === 0) return 0
  return (props.currentPage - 1) * props.limit + 1
})

const endRecord = computed(() => {
  return Math.min(props.currentPage * props.limit, props.totalItems)
})

function changePage(page: number) {
  if (page >= 1 && page <= props.lastPage && page !== props.currentPage) {
    emit('update:page', page)
  }
}

function changeLimit(e: Event) {
  const target = e.target as HTMLSelectElement
  emit('update:limit', Number(target.value))
}
</script>

<template>
  <div class="flex flex-col sm:flex-row justify-between items-center bg-slate-50 border-t border-slate-100 p-4 text-xs font-medium text-slate-500">
    <div class="mb-4 sm:mb-0">
      Showing <span class="font-bold text-slate-700">{{ startRecord }}</span> to <span class="font-bold text-slate-700">{{ endRecord }}</span> of <span class="font-bold text-slate-700">{{ totalItems }}</span> records
    </div>
    
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="uppercase tracking-wider">Rows</span>
        <select
          :value="limit"
          @change="changeLimit"
          class="bg-white border border-slate-200 text-slate-700 rounded-md py-1 px-2 text-xs focus:ring-2 focus:ring-[#447794]/20 outline-none cursor-pointer"
        >
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
      
      <div class="flex items-center gap-1">
        <button
          @click="changePage(1)"
          :disabled="currentPage === 1"
          class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDoubleLeftIcon class="w-4 h-4" />
        </button>
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon class="w-4 h-4" />
        </button>
        
        <div class="bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-md flex items-center gap-1 mx-1">
          <span class="font-bold text-[#447794]">{{ currentPage }}</span>
          <span class="text-slate-300">/</span>
          <span>{{ lastPage }}</span>
        </div>
        
        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === lastPage"
          class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRightIcon class="w-4 h-4" />
        </button>
        <button
          @click="changePage(lastPage)"
          :disabled="currentPage === lastPage"
          class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDoubleRightIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
