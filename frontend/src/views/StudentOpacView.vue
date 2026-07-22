<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/useLibraryStore'
import { MagnifyingGlassIcon, FunnelIcon, BookOpenIcon, XMarkIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { CheckCircleIcon } from '@heroicons/vue/24/solid'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const store = useLibraryStore()

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
  <div class="min-h-screen bg-[#F7F5F0] dark:bg-[#0F172A] transition-colors duration-200">
    <NavBar />

    <!-- Hero Search Section -->
    <div class="py-10 sm:py-14 px-4 sm:px-6">
      <div class="max-w-4xl mx-auto text-center">
        <!-- Main Title & Subtitle -->
        <div class="flex items-center justify-center gap-3 mb-2">
          <BookOpenIcon class="w-8 h-8 sm:w-9 sm:h-9 text-[#6B131D] dark:text-rose-400" />
          <h1 class="text-2xl sm:text-3xl font-extrabold text-[#6B131D] dark:text-rose-400 tracking-tight">
            Lumina Library Catalog
          </h1>
        </div>
        <p class="text-[#6B7280] dark:text-slate-400 text-sm sm:text-base mb-8 max-w-xl mx-auto">
          Search thousands of books, check availability, and manage your borrowings.
        </p>

        <!-- Search Bar Surface (#FFFFFF / dark:bg-[#1E293B]) -->
        <div class="relative max-w-3xl mx-auto flex flex-col sm:flex-row shadow-md rounded-2xl bg-[#FFFFFF] dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/70 overflow-hidden focus-within:ring-2 focus-within:ring-[#6B131D]/40 dark:focus-within:ring-rose-500/40 transition-all">
          <!-- Dropdown container (#ECEBE8 / dark:bg-[#283548]) -->
          <div class="relative w-full sm:w-auto bg-[#ECEBE8] dark:bg-[#283548]">
            <select
              v-model="store.searchBy"
              @change="store.searchBooks(1)"
              class="w-full sm:w-auto h-full pl-5 pr-10 py-3 sm:py-3.5 text-sm font-semibold text-[#1F2937] dark:text-slate-100 bg-transparent focus:outline-none cursor-pointer appearance-none border-b sm:border-b-0 sm:border-r border-slate-300/70 dark:border-slate-700"
            >
              <option value="all">All Fields</option>
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="isbn">ISBN</option>
              <option value="callNumber">Call Number</option>
            </select>
            <!-- Custom chevron icon -->
            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6B7280] dark:text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>

          <!-- Input field -->
          <div class="relative flex-1 bg-[#FFFFFF] dark:bg-[#1E293B]">
            <MagnifyingGlassIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-slate-400" />
            <input
              id="opac-search"
              v-model="searchInput"
              type="search"
              placeholder="Enter search terms..."
              class="w-full h-full pl-12 pr-12 py-3 sm:py-3.5 text-[#1F2937] dark:text-slate-100 text-sm sm:text-base font-medium focus:outline-none bg-transparent placeholder-[#6B7280] dark:placeholder-slate-400"
            />
            <button
              v-if="searchInput"
              @click="clearSearch"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-slate-400 hover:text-[#1F2937] dark:hover:text-slate-100 transition-colors"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- 3 Quick Status Pills -->
        <div class="flex flex-wrap justify-center items-center gap-2.5 sm:gap-4 mt-6 text-xs sm:text-sm font-semibold">
          <!-- Steel Blue Pill (#3880C3) -->
          <span class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#3880C3] text-white shadow-xs">
            {{ store.totalBooks.toLocaleString() }} books found
          </span>

          <!-- Emerald Green Pill (#38A169) -->
          <span class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#38A169] text-white shadow-xs">
            <CheckIcon class="w-4 h-4 stroke-[3]" /> Available Now
          </span>

          <!-- Deep Burgundy Pill (#6B131D) -->
          <span class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#6B131D] text-white shadow-xs">
            <CheckIcon class="w-4 h-4 stroke-[3]" /> Reserve Online
          </span>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 pb-12 flex flex-col lg:flex-row gap-6">

      <!-- Sidebar Filters Container (#ECEBE8 / dark:bg-[#1E293B]) -->
      <aside :class="['w-full lg:w-64 flex-shrink-0', showFilters ? 'block' : 'hidden lg:block']">
        <div class="bg-[#ECEBE8] dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-300/60 dark:border-slate-700/60 lg:sticky lg:top-20 transition-colors">
          <div class="flex items-center gap-2 mb-5 text-[#1F2937] dark:text-slate-100">
            <FunnelIcon class="w-4 h-4 text-[#6B7280] dark:text-slate-400" />
            <h2 class="font-bold text-sm tracking-wide">Filters</h2>
          </div>

          <!-- Availability Checkboxes -->
          <div class="mb-6">
            <p class="text-[11px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider mb-2.5">AVAILABILITY</p>
            <div class="space-y-2">
              <label class="flex items-center gap-2.5 cursor-pointer">
                <input
                  v-model="store.availableOnly"
                  @change="handleFilterChange"
                  type="checkbox"
                  class="w-4 h-4 accent-[#6B131D] dark:accent-rose-500 rounded border-slate-300 dark:border-slate-600"
                />
                <span class="text-sm text-[#1F2937] dark:text-slate-200">Available only</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer">
                <input
                  v-model="store.excludeReference"
                  @change="handleFilterChange"
                  type="checkbox"
                  class="w-4 h-4 accent-[#6B131D] dark:accent-rose-500 rounded border-slate-300 dark:border-slate-600"
                />
                <span class="text-sm text-[#1F2937] dark:text-slate-200">Exclude reference</span>
              </label>
            </div>
          </div>

          <!-- Publish Year Inputs -->
          <div class="mb-6">
            <p class="text-[11px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider mb-2.5">PUBLISH YEAR</p>
            <div class="flex gap-2">
              <input 
                v-model="store.publishYearStart" 
                @change="handleFilterChange" 
                type="number" 
                placeholder="From" 
                class="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#283548] border border-slate-200 dark:border-slate-700 text-xs text-[#1F2937] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#6B131D] dark:focus:ring-rose-500 placeholder-slate-400 dark:placeholder-slate-500"
              />
              <input 
                v-model="store.publishYearEnd" 
                @change="handleFilterChange" 
                type="number" 
                placeholder="To" 
                class="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#283548] border border-slate-200 dark:border-slate-700 text-xs text-[#1F2937] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#6B131D] dark:focus:ring-rose-500 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <!-- Item Type Selector -->
          <div class="mb-6">
            <p class="text-[11px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider mb-2.5">ITEM TYPE</p>
            <div class="space-y-1">
              <button
                @click="handleItemTypeSelect(null)"
                :class="['w-full text-left px-3 py-2 rounded-xl text-xs transition-colors font-medium cursor-pointer',
                  store.selectedItemType === null
                    ? 'bg-[#6B131D] text-white font-semibold shadow-xs'
                    : 'text-[#1F2937] dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60']"
              >
                All Types
              </button>
              <button
                v-for="type in itemTypes"
                :key="type"
                @click="handleItemTypeSelect(type)"
                :class="['w-full text-left px-3 py-2 rounded-xl text-xs transition-colors font-medium cursor-pointer',
                  store.selectedItemType === type
                    ? 'bg-[#6B131D] text-white font-semibold shadow-xs'
                    : 'text-[#1F2937] dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60']"
              >
                {{ type }}
              </button>
            </div>
          </div>

          <!-- Category Selector -->
          <div>
            <p class="text-[11px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider mb-2.5">GENRE / CATEGORY</p>
            <div class="space-y-1 max-h-48 overflow-y-auto pr-1">
              <button
                @click="handleCategorySelect(null)"
                :class="['w-full text-left px-3 py-2 rounded-xl text-xs transition-colors font-medium cursor-pointer',
                  store.selectedCategory === null
                    ? 'bg-[#6B131D] text-white font-semibold shadow-xs'
                    : 'text-[#1F2937] dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60']"
              >
                All Categories
              </button>
              <button
                v-for="cat in store.categories"
                :key="cat.id"
                @click="handleCategorySelect(cat.id)"
                :class="['w-full text-left px-3 py-2 rounded-xl text-xs transition-colors font-medium cursor-pointer',
                  store.selectedCategory === cat.id
                    ? 'bg-[#6B131D] text-white font-semibold shadow-xs'
                    : 'text-[#1F2937] dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60']"
              >
                {{ cat.name }}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Books Results Area -->
      <div class="flex-1 min-w-0">

        <!-- Results Counter Bar -->
        <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p class="text-xs sm:text-sm text-[#6B7280] dark:text-slate-400">
            Showing <span class="font-bold text-[#1F2937] dark:text-slate-100">{{ store.books.length }}</span> of
            <span class="font-bold text-[#1F2937] dark:text-slate-100">{{ store.totalBooks }}</span> results
            <span v-if="store.searchQuery"> for <em class="text-[#1F2937] dark:text-slate-100">"{{ store.searchQuery }}"</em></span>
          </p>
          <!-- Mobile Filters Toggle -->
          <button
            @click="showFilters = !showFilters"
            :class="['lg:hidden px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-[#1F2937] dark:text-slate-200 bg-white dark:bg-[#1E293B] flex items-center gap-1.5', showFilters ? 'bg-slate-200 dark:bg-slate-800' : '']"
          >
            <FunnelIcon class="w-4 h-4" />{{ showFilters ? 'Hide Filters' : 'Show Filters' }}
          </button>
        </div>

        <!-- Skeleton Loading -->
        <div v-if="store.loading" class="bg-white dark:bg-[#1E293B] rounded-2xl p-6 space-y-4 border border-slate-200/80 dark:border-slate-700/60">
          <div v-for="i in 5" :key="i" class="flex gap-4 items-center animate-pulse">
            <div class="w-10 h-14 bg-slate-200 dark:bg-slate-700 rounded" />
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
            </div>
          </div>
        </div>

        <!-- Books List grouped by Item Type (Surface: #FFFFFF / dark:bg-[#1E293B]) -->
        <div v-else-if="store.books.length > 0" class="space-y-6">
          <div v-for="(groupBooks, type) in groupedBooks" :key="type" class="bg-[#FFFFFF] dark:bg-[#1E293B] rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs overflow-hidden transition-colors">
            <!-- Header inside Content Card Container -->
            <div class="bg-white dark:bg-[#1E293B] px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <h3 class="font-bold text-[#1F2937] dark:text-slate-100 text-base uppercase tracking-wider">{{ type }}</h3>
              <span class="px-2.5 py-0.5 rounded-full bg-[#ECEBE8] dark:bg-[#283548] text-[#6B7280] dark:text-slate-300 text-xs font-semibold">
                {{ groupBooks.length }} {{ groupBooks.length === 1 ? 'item' : 'items' }}
              </span>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead class="bg-white dark:bg-[#1E293B] border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th class="py-3 px-5 text-[11px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">TITLE / DETAILS</th>
                    <th class="py-3 px-5 text-[11px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">CATEGORY</th>
                    <th class="py-3 px-5 text-[11px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">CALL NUMBER</th>
                    <th class="py-3 px-5 text-[11px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">AVAILABILITY</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr
                    v-for="book in groupBooks"
                    :key="book.id"
                    @click="router.push({ name: 'BookDetail', params: { id: book.id } })"
                    class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <!-- TITLE / DETAILS -->
                    <td class="py-4 px-5">
                      <div class="flex items-center gap-4">
                        <!-- Book Cover Placeholder (#ECEBE8 / dark:bg-[#283548]) -->
                        <div class="w-10 h-13 bg-[#ECEBE8] dark:bg-[#283548] rounded border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                          <img v-if="book.coverImageUrl" :src="book.coverImageUrl" class="w-full h-full object-cover" />
                          <BookOpenIcon v-else class="w-5 h-5 text-[#6B7280] dark:text-slate-400" />
                        </div>
                        <div class="min-w-0 max-w-[280px] sm:max-w-[380px]">
                          <p class="font-bold text-[#1F2937] dark:text-slate-100 text-sm group-hover:text-[#6B131D] dark:group-hover:text-rose-400 transition-colors line-clamp-1">
                            {{ book.title }}
                          </p>
                          <p v-if="book.authors?.length" class="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5 truncate">
                            {{ book.authors.join(', ') }}
                          </p>
                          <p class="text-[11px] text-[#6B7280] dark:text-slate-400 mt-0.5">
                            {{ book.publishYear ?? '' }} <span v-if="book.publishYear && book.publisher"> - </span> {{ book.publisher }}
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    <!-- CATEGORY -->
                    <td class="py-4 px-5 whitespace-nowrap">
                      <span v-if="book.category" class="inline-block px-2.5 py-1 rounded-full bg-[#ECEBE8] dark:bg-[#283548] text-[#1F2937] dark:text-slate-200 text-[10px] font-semibold">
                        {{ book.category.name }}
                      </span>
                      <span v-else class="text-xs text-[#6B7280] dark:text-slate-400">—</span>
                    </td>
                    
                    <!-- CALL NUMBER -->
                    <td class="py-4 px-5 whitespace-nowrap">
                      <p class="font-mono text-xs text-[#6B7280] dark:text-slate-400 font-medium">{{ book.callNumber }}</p>
                    </td>
                    
                    <!-- AVAILABILITY (Status Accents: #DCFCE7 bg, #15803D text) -->
                    <td class="py-4 px-5 whitespace-nowrap">
                      <div class="flex items-center">
                        <span v-if="book.availableCopies > 0 && !book.isReferenceOnly"
                              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] dark:bg-emerald-950/80 text-[#15803D] dark:text-emerald-400 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/40">
                          <CheckCircleIcon class="w-4 h-4 text-[#15803D] dark:text-emerald-400" /> {{ book.availableCopies }}/{{ book.totalCopies }} Available
                        </span>
                        <span v-else-if="book.isReferenceOnly"
                              class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-400 text-xs font-bold border border-sky-200/60 dark:border-sky-800/40">
                          Reference Only
                        </span>
                        <span v-else
                              class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-400 text-xs font-bold border border-rose-200/60 dark:border-rose-800/40">
                          Unavailable
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="bg-white dark:bg-[#1E293B] rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-700/60">
          <BookOpenIcon class="w-14 h-14 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p class="text-base font-bold text-[#1F2937] dark:text-slate-100">No books found</p>
          <p class="text-xs text-[#6B7280] dark:text-slate-400 mt-1">Try adjusting your search criteria or clearing active filters.</p>
          <button @click="clearSearch" class="mt-4 btn-ghost text-xs">Clear Search</button>
        </div>

        <!-- Pagination -->
        <div v-if="store.lastPage > 1" class="flex flex-wrap justify-center gap-2 mt-8">
          <button
            v-for="page in store.lastPage"
            :key="page"
            @click="goToPage(page)"
            :class="['w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer',
              page === store.currentPage
                ? 'bg-[#6B131D] text-white shadow-sm'
                : 'bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[#6B7280] dark:text-slate-300 hover:border-[#6B131D]/50 hover:text-[#6B131D] dark:hover:text-white']"
          >
            {{ page }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
