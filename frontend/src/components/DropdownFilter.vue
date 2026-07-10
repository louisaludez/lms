<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ChevronDownIcon, CheckIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  modelValue: any
  options: { label: string; value: any }[]
  placeholder?: string
  width?: string
}>()

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const toggle = () => { isOpen.value = !isOpen.value }

const selectOption = (value: any) => {
  emit('update:modelValue', value)
  emit('change', value)
  isOpen.value = false
}

const selectedLabel = computed(() => {
  const selected = props.options.find(opt => opt.value === props.modelValue)
  return selected ? selected.label : (props.placeholder || 'Select...')
})

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="relative inline-block text-left" ref="dropdownRef">
    <button
      @click="toggle"
      type="button"
      :class="[
        'inline-flex items-center justify-between gap-2 px-3 py-2 bg-white border rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#447794]/20 shadow-sm',
        isOpen ? 'border-[#447794]/40 ring-2 ring-[#447794]/20 text-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-[#447794]/40',
        width || 'w-auto'
      ]"
    >
      <div class="flex items-center gap-2 overflow-hidden">
        <slot name="icon"></slot>
        <span class="truncate">{{ selectedLabel }}</span>
      </div>
      <ChevronDownIcon class="w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
    </button>

    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 right-0 mt-2 min-w-[200px] w-full origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-slate-900/5 focus:outline-none overflow-hidden"
      >
        <div class="py-1 max-h-64 overflow-y-auto">
          <button
            v-for="option in options"
            :key="option.value"
            @click="selectOption(option.value)"
            class="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors"
            :class="option.value === modelValue ? 'text-[#447794] bg-[#447794]/5 font-bold' : 'text-slate-700'"
          >
            <span class="truncate pr-2">{{ option.label }}</span>
            <CheckIcon v-if="option.value === modelValue" class="w-4 h-4 text-[#447794] flex-shrink-0" />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
