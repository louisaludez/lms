<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api/axios'
import { ArrowsRightLeftIcon, QrCodeIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

const route = useRoute()

// ── Checkout State ────────────────────────────────────────────────────────────
const checkoutUserBarcode = ref('')
const checkoutBarcode  = ref('')
const checkoutDueDate  = ref('')
const checkoutNotes    = ref('')
const checkoutResult   = ref<any>(null)
const checkoutError    = ref('')
const checkoutLoading  = ref(false)

// User Autocomplete
const userSearchResults = ref<any[]>([])
const showUserDropdown = ref(false)
const searchTimeout = ref<any>(null)
const userDropdownIndex = ref(-1)

function onUserSearchInput() {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  const val = checkoutUserBarcode.value
  if (!val || val.length < 1) {
    userSearchResults.value = []
    showUserDropdown.value = false
    userDropdownIndex.value = -1
    return
  }

  searchTimeout.value = setTimeout(async () => {
    try {
      const { data } = await api.get(`/users?search=${encodeURIComponent(val)}&limit=5`)
      userSearchResults.value = data.data || []
      showUserDropdown.value = userSearchResults.value.length > 0
      userDropdownIndex.value = -1
    } catch (e) {
      console.error('Failed to search users', e)
      userSearchResults.value = []
      showUserDropdown.value = false
    }
  }, 150)
}

function selectUser(user: any) {
  checkoutUserBarcode.value = user.barcode
  showUserDropdown.value = false
  userDropdownIndex.value = -1
}

function onUserSearchFocus() {
  if (userSearchResults.value.length > 0) {
    showUserDropdown.value = true
  }
}

function onUserSearchBlur() {
  setTimeout(() => {
    showUserDropdown.value = false
  }, 150)
}

function onUserKeydown(e: KeyboardEvent) {
  if (!showUserDropdown.value || userSearchResults.value.length === 0) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    userDropdownIndex.value = Math.min(userDropdownIndex.value + 1, userSearchResults.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    userDropdownIndex.value = Math.max(userDropdownIndex.value - 1, -1)
  } else if (e.key === 'Enter' && userDropdownIndex.value >= 0) {
    e.preventDefault()
    selectUser(userSearchResults.value[userDropdownIndex.value])
  } else if (e.key === 'Escape') {
    showUserDropdown.value = false
    userDropdownIndex.value = -1
  }
}

function clearUserSearch() {
  checkoutUserBarcode.value = ''
  userSearchResults.value = []
  showUserDropdown.value = false
  userDropdownIndex.value = -1
}

// ── Return State ──────────────────────────────────────────────────────────────
const returnBarcode   = ref(typeof route.query.returnBarcode === 'string' ? route.query.returnBarcode : '')
const returnResult    = ref<any>(null)
const returnError     = ref('')
const returnLoading   = ref(false)

// ── Renew State ───────────────────────────────────────────────────────────────
const renewBarcode    = ref('')
const renewDueDate    = ref('')

onMounted(() => {
  if (route.query.returnBarcode && typeof route.query.returnBarcode === 'string') {
    returnBarcode.value = route.query.returnBarcode
  }
})
const renewResult     = ref<any>(null)
const renewError      = ref('')
const renewLoading    = ref(false)

// ── Book Copy Autocomplete Helper ─────────────────────────────────────────────
function createBookCopySearch(modelRef: any) {
  const searchResults = ref<any[]>([])
  const showDropdown = ref(false)
  const searchTimeout = ref<any>(null)
  const dropdownIndex = ref(-1)

  function onSearchInput() {
    if (searchTimeout.value) clearTimeout(searchTimeout.value)
    const val = modelRef.value
    if (!val || val.length < 1) {
      searchResults.value = []
      showDropdown.value = false
      dropdownIndex.value = -1
      return
    }

    searchTimeout.value = setTimeout(async () => {
      try {
        const { data } = await api.get(`/books/copies/search?search=${encodeURIComponent(val)}&limit=5`)
        searchResults.value = data || []
        showDropdown.value = searchResults.value.length > 0
        dropdownIndex.value = -1
      } catch (e) {
        console.error('Failed to search book copies', e)
        searchResults.value = []
        showDropdown.value = false
      }
    }, 150)
  }

  function selectCopy(copy: any) {
    modelRef.value = copy.barcode
    showDropdown.value = false
    dropdownIndex.value = -1
  }

  function onSearchFocus() {
    if (searchResults.value.length > 0) {
      showDropdown.value = true
    }
  }

  function onSearchBlur() {
    setTimeout(() => {
      showDropdown.value = false
    }, 150)
  }

  function onKeydown(e: KeyboardEvent) {
    if (!showDropdown.value || searchResults.value.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      dropdownIndex.value = Math.min(dropdownIndex.value + 1, searchResults.value.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      dropdownIndex.value = Math.max(dropdownIndex.value - 1, -1)
    } else if (e.key === 'Enter' && dropdownIndex.value >= 0) {
      e.preventDefault()
      selectCopy(searchResults.value[dropdownIndex.value])
    } else if (e.key === 'Escape') {
      showDropdown.value = false
      dropdownIndex.value = -1
    }
  }

  function clearSearch() {
    modelRef.value = ''
    searchResults.value = []
    showDropdown.value = false
    dropdownIndex.value = -1
  }

  return {
    searchResults,
    showDropdown,
    dropdownIndex,
    onSearchInput,
    selectCopy,
    onSearchFocus,
    onSearchBlur,
    onKeydown,
    clearSearch,
  }
}

const checkoutBookSearch = createBookCopySearch(checkoutBarcode)
const returnBookSearch = createBookCopySearch(returnBarcode)
const renewBookSearch = createBookCopySearch(renewBarcode)

async function handleCheckout() {
  checkoutLoading.value = true
  checkoutResult.value = null
  checkoutError.value = ''
  try {
    const { data } = await api.post('/transactions/checkout', {
      userBarcode: checkoutUserBarcode.value,
      bookCopyBarcode: checkoutBarcode.value,
      dueDate: checkoutDueDate.value || undefined,
      notes: checkoutNotes.value,
    })
    checkoutResult.value = data
    checkoutUserBarcode.value = ''
    checkoutBarcode.value = ''
    checkoutDueDate.value = ''
    checkoutNotes.value = ''
  } catch (e: any) {
    checkoutError.value = e.response?.data?.message ?? 'Checkout failed'
  } finally {
    checkoutLoading.value = false
  }
}

async function handleReturn() {
  returnLoading.value = true
  returnResult.value = null
  returnError.value = ''
  try {
    const { data } = await api.post('/transactions/return', {
      bookCopyBarcode: returnBarcode.value,
    })
    returnResult.value = data
    returnBarcode.value = ''
  } catch (e: any) {
    returnError.value = e.response?.data?.message ?? 'Return failed'
  } finally {
    returnLoading.value = false
  }
}

async function handleRenew() {
  renewLoading.value = true
  renewResult.value = null
  renewError.value = ''
  try {
    const { data } = await api.post('/transactions/renew', {
      bookCopyBarcode: renewBarcode.value,
      dueDate: renewDueDate.value || undefined,
    })
    renewResult.value = data
    renewBarcode.value = ''
    renewDueDate.value = ''
  } catch (e: any) {
    renewError.value = e.response?.data?.message ?? 'Renewal failed'
  } finally {
    renewLoading.value = false
  }
}
</script>

<template>
  <div class="grid lg:grid-cols-3 gap-6 w-full max-w-[1600px] mx-auto">

    <!-- Checkout Panel -->
    <div class="card p-6">
      <div class="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
        <div class="w-10 h-10 rounded-xl bg-[#447794]/10 flex items-center justify-center">
          <ArrowsRightLeftIcon class="w-5 h-5 text-[#447794]" />
        </div>
        <h2 class="font-semibold text-slate-800">Check Out Book</h2>
      </div>

      <form @submit.prevent="handleCheckout" class="space-y-4">
        <div class="relative">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Borrower ID</label>
          <div class="relative">
            <input
              id="checkout-user-id"
              v-model="checkoutUserBarcode"
              @input="onUserSearchInput"
              @focus="onUserSearchFocus"
              @blur="onUserSearchBlur"
              @keydown="onUserKeydown"
              type="text"
              required
              placeholder="Scan ID or type name..."
              class="input font-mono pr-10"
              autocomplete="off"
            />
            <button
              type="button"
              v-if="checkoutUserBarcode"
              @click="clearUserSearch"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <!-- User Dropdown -->
          <ul v-if="showUserDropdown" class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
            <li
              v-for="(u, idx) in userSearchResults"
              :key="u.id"
              @mousedown.prevent="selectUser(u)"
              :class="[
                'px-4 py-2 cursor-pointer border-b border-slate-50 last:border-0',
                idx === userDropdownIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
              ]"
            >
              <div class="font-semibold text-sm text-slate-800">{{ u.firstName }} {{ u.lastName }}</div>
              <div class="text-xs text-slate-500 font-mono">{{ u.barcode }} • {{ u.role }}</div>
            </li>
            <li v-if="userSearchResults.length === 0" class="px-4 py-2 text-center text-slate-400 text-sm">No users found</li>
          </ul>
        </div>
        <div class="relative">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Book Barcode</label>
          <div class="relative">
            <input
              id="checkout-barcode"
              v-model="checkoutBarcode"
              @input="checkoutBookSearch.onSearchInput"
              @focus="checkoutBookSearch.onSearchFocus"
              @blur="checkoutBookSearch.onSearchBlur"
              @keydown="checkoutBookSearch.onKeydown"
              type="text"
              required
              placeholder="Scan barcode or type title..."
              class="input font-mono pr-10"
              autocomplete="off"
            />
            <button
              type="button"
              v-if="checkoutBarcode"
              @click="checkoutBookSearch.clearSearch"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <!-- Book Dropdown -->
          <ul v-if="checkoutBookSearch.showDropdown.value" class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
            <li
              v-for="(copy, idx) in checkoutBookSearch.searchResults.value"
              :key="copy.id"
              @mousedown.prevent="checkoutBookSearch.selectCopy(copy)"
              :class="[
                'px-4 py-2 cursor-pointer border-b border-slate-50 last:border-0',
                idx === checkoutBookSearch.dropdownIndex.value ? 'bg-slate-100' : 'hover:bg-slate-50'
              ]"
            >
              <div class="font-semibold text-sm text-slate-800">{{ copy.book?.title }}</div>
              <div class="text-xs text-slate-500 font-mono">{{ copy.barcode }}<span v-if="copy.book?.callNumber"> • Call No: {{ copy.book.callNumber }}</span></div>
            </li>
            <li v-if="checkoutBookSearch.searchResults.value.length === 0" class="px-4 py-2 text-center text-slate-400 text-sm">No books found</li>
          </ul>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Manual Due Date (Optional)</label>
          <input v-model="checkoutDueDate" type="date" class="input" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes (optional)</label>
          <input v-model="checkoutNotes" type="text" placeholder="Optional notes..." class="input" />
        </div>
        <button type="submit" :disabled="checkoutLoading" class="btn-primary w-full justify-center">
          {{ checkoutLoading ? 'Processing...' : 'Check Out' }}
        </button>
      </form>

      <!-- Result -->
      <div v-if="checkoutError" class="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        {{ checkoutError }}
      </div>
      <div v-if="checkoutResult" class="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
        <p class="font-semibold text-emerald-700">✅ Checked Out Successfully!</p>
        <p class="text-slate-600 mt-1">
          <strong>{{ checkoutResult.bookCopy.book.title }}</strong><br/>
          Due: <strong>{{ checkoutResult.dueDate }}</strong><br/>
          Borrower: {{ checkoutResult.user.firstName }} {{ checkoutResult.user.lastName }}
        </p>
      </div>
    </div>

    <!-- Return Panel -->
    <div class="card p-6">
      <div class="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
        <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <QrCodeIcon class="w-5 h-5 text-emerald-600" />
        </div>
        <h2 class="font-semibold text-slate-800">Return Book</h2>
      </div>

      <form @submit.prevent="handleReturn" class="space-y-4">
        <div class="relative">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Book Barcode</label>
          <div class="relative">
            <input
              id="return-barcode"
              v-model="returnBarcode"
              @input="returnBookSearch.onSearchInput"
              @focus="returnBookSearch.onSearchFocus"
              @blur="returnBookSearch.onSearchBlur"
              @keydown="returnBookSearch.onKeydown"
              type="text"
              required
              placeholder="Scan barcode or type title..."
              class="input font-mono pr-10"
              autocomplete="off"
            />
            <button
              type="button"
              v-if="returnBarcode"
              @click="returnBookSearch.clearSearch"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <!-- Book Dropdown -->
          <ul v-if="returnBookSearch.showDropdown.value" class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
            <li
              v-for="(copy, idx) in returnBookSearch.searchResults.value"
              :key="copy.id"
              @mousedown.prevent="returnBookSearch.selectCopy(copy)"
              :class="[
                'px-4 py-2 cursor-pointer border-b border-slate-50 last:border-0',
                idx === returnBookSearch.dropdownIndex.value ? 'bg-slate-100' : 'hover:bg-slate-50'
              ]"
            >
              <div class="font-semibold text-sm text-slate-800">{{ copy.book?.title }}</div>
              <div class="text-xs text-slate-500 font-mono">{{ copy.barcode }}<span v-if="copy.book?.callNumber"> • Call No: {{ copy.book.callNumber }}</span></div>
            </li>
            <li v-if="returnBookSearch.searchResults.value.length === 0" class="px-4 py-2 text-center text-slate-400 text-sm">No books found</li>
          </ul>
        </div>
        <button type="submit" :disabled="returnLoading" class="btn-primary w-full justify-center bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200">
          {{ returnLoading ? 'Processing...' : 'Return Book' }}
        </button>
      </form>

      <div v-if="returnError" class="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        {{ returnError }}
      </div>
      <div v-if="returnResult" class="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
        <p class="font-semibold text-emerald-700">✅ Returned Successfully!</p>
        <p class="text-slate-600 mt-1">
          <strong>{{ returnResult.bookCopy.book.title }}</strong><br/>
          Returned by: {{ returnResult.user.firstName }} {{ returnResult.user.lastName }}<br/>
        </p>
      </div>
    </div>

    <!-- Renew Panel -->
    <div class="card p-6">
      <div class="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
        <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <ArrowPathIcon class="w-5 h-5 text-purple-600" />
        </div>
        <h2 class="font-semibold text-slate-800">Renew Book</h2>
      </div>

      <form @submit.prevent="handleRenew" class="space-y-4">
        <div class="relative">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Book Barcode</label>
          <div class="relative">
            <input
              id="renew-barcode"
              v-model="renewBarcode"
              @input="renewBookSearch.onSearchInput"
              @focus="renewBookSearch.onSearchFocus"
              @blur="renewBookSearch.onSearchBlur"
              @keydown="renewBookSearch.onKeydown"
              type="text"
              required
              placeholder="Scan barcode or type title..."
              class="input font-mono pr-10"
              autocomplete="off"
            />
            <button
              type="button"
              v-if="renewBarcode"
              @click="renewBookSearch.clearSearch"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <!-- Book Dropdown -->
          <ul v-if="renewBookSearch.showDropdown.value" class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
            <li
              v-for="(copy, idx) in renewBookSearch.searchResults.value"
              :key="copy.id"
              @mousedown.prevent="renewBookSearch.selectCopy(copy)"
              :class="[
                'px-4 py-2 cursor-pointer border-b border-slate-50 last:border-0',
                idx === renewBookSearch.dropdownIndex.value ? 'bg-slate-100' : 'hover:bg-slate-50'
              ]"
            >
              <div class="font-semibold text-sm text-slate-800">{{ copy.book?.title }}</div>
              <div class="text-xs text-slate-500 font-mono">{{ copy.barcode }}<span v-if="copy.book?.callNumber"> • Call No: {{ copy.book.callNumber }}</span></div>
            </li>
            <li v-if="renewBookSearch.searchResults.value.length === 0" class="px-4 py-2 text-center text-slate-400 text-sm">No books found</li>
          </ul>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Manual Due Date (Optional)</label>
          <input v-model="renewDueDate" type="date" class="input" />
        </div>
        <button type="submit" :disabled="renewLoading" class="btn-primary w-full justify-center bg-purple-600 hover:bg-purple-700 shadow-purple-200">
          {{ renewLoading ? 'Processing...' : 'Renew Book' }}
        </button>
      </form>

      <div v-if="renewError" class="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        {{ renewError }}
      </div>
      <div v-if="renewResult" class="mt-4 p-4 rounded-xl bg-purple-50 border border-purple-200 text-sm">
        <p class="font-semibold text-purple-700">✅ Renewed Successfully!</p>
        <p class="text-slate-600 mt-1">
          <strong>{{ renewResult.bookCopy.book.title }}</strong><br/>
          New Due Date: <strong>{{ renewResult.dueDate }}</strong><br/>
          Renewals: {{ renewResult.renewalCount }} / 2
        </p>
      </div>
    </div>

  </div>
</template>
