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

function onUserSearchInput() {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  if (!checkoutUserBarcode.value || checkoutUserBarcode.value.length < 2) {
    userSearchResults.value = []
    showUserDropdown.value = false
    return
  }
  
  searchTimeout.value = setTimeout(async () => {
    try {
      const { data } = await api.get(`/users?search=${encodeURIComponent(checkoutUserBarcode.value)}&limit=5`)
      userSearchResults.value = data.data || []
      showUserDropdown.value = userSearchResults.value.length > 0
    } catch (e) {
      console.error('Failed to search users', e)
    }
  }, 300)
}

function selectUser(user: any) {
  checkoutUserBarcode.value = user.barcode
  showUserDropdown.value = false
}

function onUserSearchFocus() {
  if (userSearchResults.value.length > 0 && checkoutUserBarcode.value.length >= 2) {
    showUserDropdown.value = true
  }
}

function onUserSearchBlur() {
  // Delay to allow mousedown on dropdown item to fire
  setTimeout(() => {
    showUserDropdown.value = false
  }, 150)
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
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Student/Faculty Barcode</label>
          <input
            id="checkout-user-id"
            v-model="checkoutUserBarcode"
            @input="onUserSearchInput"
            @focus="onUserSearchFocus"
            @blur="onUserSearchBlur"
            type="text"
            required
            placeholder="Scan ID or type name..."
            class="input font-mono"
            autocomplete="off"
          />
          <!-- User Dropdown -->
          <ul v-if="showUserDropdown" class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
            <li 
              v-for="u in userSearchResults" 
              :key="u.id"
              @mousedown.prevent="selectUser(u)"
              class="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
            >
              <div class="font-semibold text-sm text-slate-800">{{ u.firstName }} {{ u.lastName }}</div>
              <div class="text-xs text-slate-500 font-mono">{{ u.barcode }} • {{ u.role }}</div>
            </li>
          </ul>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Book Barcode</label>
          <input
            id="checkout-barcode"
            v-model="checkoutBarcode"
            type="text"
            required
            placeholder="Scan or type book barcode"
            class="input font-mono"
            autocomplete="off"
          />
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
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Book Barcode</label>
          <input
            id="return-barcode"
            v-model="returnBarcode"
            type="text"
            required
            placeholder="Scan or type book barcode"
            class="input font-mono"
            autocomplete="off"
          />
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
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Book Barcode</label>
          <input
            id="renew-barcode"
            v-model="renewBarcode"
            type="text"
            required
            placeholder="Scan or type book barcode"
            class="input font-mono"
            autocomplete="off"
          />
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
