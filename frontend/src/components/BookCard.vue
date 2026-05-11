<script setup lang="ts">
import type { Book } from '@/stores/useLibraryStore'
import { BookOpenIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'

defineProps<{ book: Book }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <div
    @click="$emit('click')"
    class="card group cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
  >
    <!-- Cover Image / Placeholder -->
    <div class="relative h-44 bg-gradient-to-b from-[#1a3f5c] to-[#061222] flex items-center justify-center overflow-hidden">
      <img
        v-if="book.coverImageUrl"
        :src="book.coverImageUrl"
        :alt="book.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div v-else class="text-center text-white/30 px-4">
        <BookOpenIcon class="w-10 h-10 mx-auto mb-2" />
        <p class="text-xs font-mono leading-tight">{{ book.callNumber }}</p>
      </div>

      <!-- Availability badge overlay -->
      <div class="absolute top-2 right-2">
        <span v-if="book.availableCopies > 0 && !book.isReferenceOnly"
              class="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white backdrop-blur-sm">
          <CheckCircleIcon class="w-3 h-3" /> Available
        </span>
        <span v-else-if="book.isReferenceOnly"
              class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/90 text-white backdrop-blur-sm">
          Reference
        </span>
        <span v-else
              class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-600/90 text-white backdrop-blur-sm">
          Unavailable
        </span>
      </div>

      <!-- Category chip -->
      <div class="absolute bottom-2 left-2">
        <span v-if="book.category" class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/40 text-white/80 backdrop-blur-sm">
          {{ book.category.name }}
        </span>
      </div>
    </div>

    <!-- Info -->
    <div class="p-3">
      <h3 class="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-[#447794] transition-colors">
        {{ book.title }}
      </h3>
      <p v-if="book.authors?.length" class="text-xs text-slate-500 mt-1 truncate">
        {{ book.authors[0] }}
      </p>
      <p class="text-xs text-slate-400 mt-1">
        {{ book.publishYear ?? '' }}
        <span v-if="book.publishYear && book.publisher"> · </span>
        {{ book.publisher }}
      </p>

      <!-- Copy count bar -->
      <div class="mt-3">
        <div class="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>Copies</span>
          <span>{{ book.availableCopies }}/{{ book.totalCopies }}</span>
        </div>
        <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :class="book.availableCopies > 0 ? 'bg-[#447794]' : 'bg-slate-300'"
            :style="{ width: book.totalCopies > 0 ? `${(book.availableCopies / book.totalCopies) * 100}%` : '0%' }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
