<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore, useAuthStore } from '@/stores/useLibraryStore'
import NavBar from '@/components/NavBar.vue'
import {
  BookOpenIcon, ArrowLeftIcon, MapPinIcon, GlobeAltIcon,
  CalendarIcon, BookmarkIcon, CheckCircleIcon, XCircleIcon, QrCodeIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const store = useLibraryStore()
const auth = useAuthStore()

onMounted(() => {
  store.fetchBook(Number(route.params.id))
})

async function handleReserve() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }
  try {
    await store.reserveBook(Number(route.params.id))
    alert('Book reserved! You have 3 days to collect it.')
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Reservation failed')
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <NavBar />

    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button @click="router.back()" class="btn-ghost mb-6 text-sm">
        <ArrowLeftIcon class="w-4 h-4" /> Back to Catalog
      </button>

      <div v-if="store.loading" class="card p-8 space-y-4">
        <div class="skeleton h-8 w-3/4" />
        <div class="skeleton h-4 w-1/2" />
        <div class="skeleton h-40 w-full" />
      </div>

      <div v-else-if="store.currentBook" class="card">
        <div class="flex flex-col md:flex-row gap-0">
          <!-- Cover -->
          <div class="w-full md:w-48 bg-gradient-to-b from-[#123249] to-[#061222] flex-shrink-0 flex items-center justify-center py-10 md:py-0 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none">
            <div class="text-center text-white px-4">
              <BookOpenIcon class="w-16 h-16 mx-auto text-white/30 mb-3" />
              <p class="text-xs text-white/40 font-mono">{{ store.currentBook.callNumber }}</p>
            </div>
          </div>

          <!-- Details -->
          <div class="flex-1 p-6 md:p-8">
            <div class="flex items-start justify-between gap-4 mb-1">
              <div>
                <p v-if="store.currentBook.category" class="text-xs font-semibold text-[#447794] uppercase tracking-wider mb-1">
                  {{ store.currentBook.category.name }}
                </p>
                <h1 class="text-2xl font-bold text-slate-900 leading-snug">{{ store.currentBook.title }}</h1>
                <p v-if="store.currentBook.authors?.length" class="text-slate-500 text-sm mt-1">
                  by {{ store.currentBook.authors.join(', ') }}
                </p>
              </div>
              <!-- Availability badge -->
              <div class="flex-shrink-0">
                <div v-if="store.currentBook.availableCopies > 0 && !store.currentBook.isReferenceOnly"
                     class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  <CheckCircleIcon class="w-4 h-4" />
                  {{ store.currentBook.availableCopies }} Available
                </div>
                <div v-else-if="store.currentBook.isReferenceOnly"
                     class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold">
                  Reference Only
                </div>
                <div v-else class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
                  <XCircleIcon class="w-4 h-4" />
                  Unavailable
                </div>
              </div>
            </div>

            <!-- Meta info -->
            <div class="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 text-sm text-slate-600 border-t border-slate-100 pt-4">
              <div class="flex items-center gap-2">
                <CalendarIcon class="w-4 h-4 text-slate-400" />
                <span>{{ store.currentBook.publishYear ?? 'N/A' }} · {{ store.currentBook.edition ?? 'Standard' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <GlobeAltIcon class="w-4 h-4 text-slate-400" />
                <span>{{ store.currentBook.language }}</span>
              </div>
              <div v-if="store.currentBook.publisher" class="flex items-center gap-2 col-span-2">
                <BookmarkIcon class="w-4 h-4 text-slate-400" />
                <span>{{ store.currentBook.publisher }}</span>
              </div>
              <div v-if="store.currentBook.locationShelf" class="flex items-center gap-2 col-span-2">
                <MapPinIcon class="w-4 h-4 text-slate-400" />
                <span>{{ store.currentBook.locationShelf }}</span>
              </div>
            </div>

            <!-- Description -->
            <p v-if="store.currentBook.description" class="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
              {{ store.currentBook.description }}
            </p>

            <!-- Copy availability bar -->
            <div class="mt-4 border-t border-slate-100 pt-4">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-slate-500 font-medium">Copy Availability</span>
                <span class="text-xs text-slate-700 font-semibold">
                  {{ store.currentBook.availableCopies }} / {{ store.currentBook.totalCopies }}
                </span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-[#447794] to-[#2D5B75] rounded-full transition-all"
                  :style="{
                    width: store.currentBook.totalCopies > 0
                      ? `${(store.currentBook.availableCopies / store.currentBook.totalCopies) * 100}%`
                      : '0%'
                  }"
                />
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-6 flex gap-3">
              <button
                v-if="store.currentBook.availableCopies === 0 && !store.currentBook.isReferenceOnly"
                @click="handleReserve"
                class="btn-primary"
              >
                <BookmarkIcon class="w-4 h-4" /> Reserve Book
              </button>
              <p v-else-if="store.currentBook.availableCopies > 0 && !auth.isLibrarian" class="text-sm text-slate-500 italic">
                Visit the library counter with your ID to borrow this book.
              </p>
            </div>
            
            <!-- Librarian Only: Physical Copies / Barcodes -->
            <div v-if="auth.isLibrarian && store.currentBook.copies && store.currentBook.copies.length > 0" class="mt-8 border-t border-slate-200 pt-6">
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <QrCodeIcon class="w-4 h-4 text-[#447794]" /> 
                Physical Copies (Barcodes)
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  v-for="copy in store.currentBook.copies" 
                  :key="copy.id"
                  class="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-slate-800 text-sm">{{ copy.barcode }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium capitalize">{{ copy.condition || 'Good' }}</span>
                  </div>
                  <span v-if="copy.isActive" class="w-2 h-2 rounded-full bg-emerald-500" title="Active"></span>
                  <span v-else class="w-2 h-2 rounded-full bg-rose-500" title="Inactive"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
