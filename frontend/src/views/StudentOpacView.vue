<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore, useAuthStore } from '@/stores/useLibraryStore'
import { MagnifyingGlassIcon, FunnelIcon, BookOpenIcon, XMarkIcon, UserCircleIcon } from '@heroicons/vue/24/outline'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/vue/24/solid'
import BookCard from '@/components/BookCard.vue'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const store = useLibraryStore()
const auth = useAuthStore()

const searchInput = ref('')
const showFilters = ref(false)

onMounted(async () => {
  await Promise.all([store.fetchCategories(), store.searchBooks()])
})

// Debounced search
let debounceTimer: ReturnType<typeof setTimeout>
watch(searchInput, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    store.searchQuery = val
    store.searchBooks(1)
  }, 400)
})

function handleCategorySelect(id: number | null) {
  store.selectedCategory = id
  store.searchBooks(1)
}

function handleFilterChange() {
  store.searchBooks(1)
}

const itemTypes = ['BOOKS', 'Journals', 'Thesis', 'CD', 'DVD', 'Cartographic Materials', 'Electronics']

function handleItemTypeSelect(type: string | null) {
  store.selectedItemType = type
  store.searchBooks(1)
}

const groupedBooks = computed(() => {
  const groups: Record<string, typeof store.books> = {}
  store.books.forEach(b => {
    // b.itemType exists on the entity, but Book interface in store might need it added.
    // It's returned by the backend by default since it's a column.
    const type = (b as any).itemType || 'BOOKS'
    if (!groups[type]) groups[type] = []
    groups[type].push(b)
  })
  return groups
})

function goToPage(page: number) {
  store.searchBooks(page)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function clearSearch() {
  searchInput.value = ''
  store.resetSearch()
  store.searchBooks(1)
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <NavBar />

    <!-- Hero Banner -->
    <div class="bg-gradient-to-br from-[#123249] via-[#1a3f5c] to-[#447794] py-14 px-6">
      <div class="max-w-4xl mx-auto text-center text-white">
        <div class="flex items-center justify-center gap-3 mb-4">
          <BookOpenIcon class="w-10 h-10 text-[#80b3ce]" />
          <h1 class="text-3xl font-bold tracking-tight">Lumina Library Catalog</h1>
        </div>
        <p class="text-[#aed0e2] text-base mb-8">
          Search thousands of books, check availability, and manage your borrowings.
        </p>

        <!-- Search Bar -->
        <div class="relative max-w-3xl mx-auto flex shadow-xl rounded-2xl bg-white focus-within:ring-2 focus-within:ring-[#447794]/60 transition-shadow">
          <div class="relative">
            <select
              v-model="store.searchBy"
              @change="store.searchBooks(1)"
              class="h-full pl-5 pr-10 py-4 rounded-l-2xl text-sm font-semibold text-slate-700 bg-slate-50 border-r border-slate-200 focus:outline-none cursor-pointer appearance-none hover:bg-slate-100 transition-colors"
            >
              <option value="all">All Fields</option>
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="isbn">ISBN</option>
              <option value="callNumber">Call Number</option>
            </select>
            <!-- Custom chevron for select -->
            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          <div class="relative flex-1">
            <MagnifyingGlassIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
            <input
              id="opac-search"
              v-model="searchInput"
              type="search"
              placeholder="Enter search term..."
              class="w-full h-full pl-12 pr-12 py-4 rounded-r-2xl text-slate-800 text-base font-medium focus:outline-none bg-transparent"
            />
            <button
              v-if="searchInput"
              @click="clearSearch"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Quick stats -->
        <div class="flex justify-center gap-8 mt-8 text-sm text-[#aed0e2]">
          <span>📚 {{ store.totalBooks.toLocaleString() }} books found</span>
          <span>✅ Available Now</span>
          <span>🔖 Reserve Online</span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex gap-6">

      <!-- Sidebar Filters (desktop) -->
      <aside class="hidden lg:block w-64 flex-shrink-0">
        <div class="card p-5 sticky top-6">
          <div class="flex items-center gap-2 mb-4">
            <FunnelIcon class="w-4 h-4 text-[#447794]" />
            <h2 class="font-semibold text-slate-700 text-sm">Filters</h2>
          </div>

          <!-- Availability -->
          <div class="mb-5">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Availability</p>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="store.availableOnly"
                @change="handleFilterChange"
                type="checkbox"
                class="w-4 h-4 accent-[#447794]"
              />
              <span class="text-sm text-slate-700">Available only</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer mt-2">
              <input
                v-model="store.excludeReference"
                @change="handleFilterChange"
                type="checkbox"
                class="w-4 h-4 accent-[#447794]"
              />
              <span class="text-sm text-slate-700">Exclude reference</span>
            </label>
          </div>

          <!-- Publish Year -->
          <div class="mb-5">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Publish Year</p>
            <div class="flex gap-2">
              <input 
                v-model="store.publishYearStart" 
                @change="handleFilterChange" 
                type="number" 
                placeholder="From" 
                class="input w-full text-sm"
              />
              <input 
                v-model="store.publishYearEnd" 
                @change="handleFilterChange" 
                type="number" 
                placeholder="To" 
                class="input w-full text-sm"
              />
            </div>
          </div>

          <!-- Item Types -->
          <div class="mb-5">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Item Type</p>
            <button
              @click="handleItemTypeSelect(null)"
              :class="['w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1',
                store.selectedItemType === null
                  ? 'bg-[#447794] text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100']"
            >
              All Types
            </button>
            <button
              v-for="type in itemTypes"
              :key="type"
              @click="handleItemTypeSelect(type)"
              :class="['w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1',
                store.selectedItemType === type
                  ? 'bg-[#447794] text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100']"
            >
              {{ type }}
            </button>
          </div>

          <!-- Categories -->
          <div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Genre / Category</p>
            <button
              @click="handleCategorySelect(null)"
              :class="['w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1',
                store.selectedCategory === null
                  ? 'bg-[#447794] text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100']"
            >
              All Categories
            </button>
            <button
              v-for="cat in store.categories"
              :key="cat.id"
              @click="handleCategorySelect(cat.id)"
              :class="['w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1',
                store.selectedCategory === cat.id
                  ? 'bg-[#447794] text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100']"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>
      </aside>

      <!-- Books Grid -->
      <div class="flex-1 min-w-0">

        <!-- Result bar -->
        <div class="flex items-center justify-between mb-5">
          <p class="text-sm text-slate-500">
            Showing <span class="font-semibold text-slate-700">{{ store.books.length }}</span> of
            <span class="font-semibold text-slate-700">{{ store.totalBooks }}</span> results
            <span v-if="store.searchQuery"> for <em>"{{ store.searchQuery }}"</em></span>
          </p>
          <!-- Mobile filters toggle -->
          <button
            @click="showFilters = !showFilters"
            class="lg:hidden btn-ghost text-xs"
          >
            <FunnelIcon class="w-4 h-4" />Filters
          </button>
        </div>

        <!-- Loading skeleton -->
        <div v-if="store.loading" class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          <div v-for="i in 12" :key="i" class="card p-4">
            <div class="skeleton h-44 w-full mb-3" />
            <div class="skeleton h-4 w-3/4 mb-2" />
            <div class="skeleton h-3 w-1/2 mb-3" />
            <div class="skeleton h-8 w-full rounded-xl" />
          </div>
        </div>

        <!-- Books grouped by Item Type -->
        <div v-else-if="store.books.length > 0" class="space-y-10">
          <div v-for="(groupBooks, type) in groupedBooks" :key="type">
            <div class="flex items-center gap-3 mb-5 border-b border-slate-200 pb-3">
              <h3 class="text-xl font-bold text-slate-800">{{ type }}</h3>
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">{{ groupBooks.length }} items</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              <BookCard
                v-for="book in groupBooks"
                :key="book.id"
                :book="book"
                @click="router.push({ name: 'BookDetail', params: { id: book.id } })"
              />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center py-24 text-slate-400">
          <BookOpenIcon class="w-16 h-16 mb-4 text-slate-300" />
          <p class="text-lg font-medium text-slate-500">No books found</p>
          <p class="text-sm mt-1">Try a different search term or clear your filters</p>
          <button @click="clearSearch" class="btn-ghost mt-4">Clear Search</button>
        </div>

        <!-- Pagination -->
        <div v-if="store.lastPage > 1" class="flex justify-center gap-2 mt-10">
          <button
            v-for="page in store.lastPage"
            :key="page"
            @click="goToPage(page)"
            :class="['w-10 h-10 rounded-xl text-sm font-semibold transition-all',
              page === store.currentPage
                ? 'bg-[#447794] text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-[#447794]/40 hover:text-[#447794]']"
          >
            {{ page }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
