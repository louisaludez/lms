<script setup lang="ts">
import { ref } from 'vue'
import api from '@/api/axios'
import { ArrowsRightLeftIcon, QrCodeIcon } from '@heroicons/vue/24/outline'

// ── Checkout State ────────────────────────────────────────────────────────────
const checkoutUserBarcode = ref('')
const checkoutBarcode  = ref('')
const checkoutDueDate  = ref('')
const checkoutNotes    = ref('')
const checkoutResult   = ref<any>(null)
const checkoutError    = ref('')
const checkoutLoading  = ref(false)

// ── Return State ──────────────────────────────────────────────────────────────
const returnBarcode   = ref('')
const returnResult    = ref<any>(null)
const returnError     = ref('')
const returnLoading   = ref(false)

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
</script>

<template>
  <div class="grid md:grid-cols-2 gap-6 max-w-4xl">

    <!-- Checkout Panel -->
    <div class="card p-6">
      <div class="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
        <div class="w-10 h-10 rounded-xl bg-[#447794]/10 flex items-center justify-center">
          <ArrowsRightLeftIcon class="w-5 h-5 text-[#447794]" />
        </div>
        <h2 class="font-semibold text-slate-800">Check Out Book</h2>
      </div>

      <form @submit.prevent="handleCheckout" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Student/Faculty Barcode</label>
          <input
            id="checkout-user-id"
            v-model="checkoutUserBarcode"
            type="text"
            required
            placeholder="Scan or type User ID"
            class="input font-mono"
            autocomplete="off"
          />
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
          <span v-if="Number(returnResult.fineAmount) > 0" class="text-rose-600 font-semibold">
            Fine: ₱{{ Number(returnResult.fineAmount).toFixed(2) }} ({{ returnResult.overdueDays }} day(s) overdue)
          </span>
          <span v-else class="text-emerald-600">No fine — returned on time!</span>
        </p>
      </div>
    </div>

  </div>
</template>
