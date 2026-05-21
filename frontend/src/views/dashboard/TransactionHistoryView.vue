<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/api/axios'
import { DocumentTextIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/vue/24/outline'

const transactions = ref<any[]>([])
const loading = ref(true)
const searchQuery = ref('')
const filterType = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get('/transactions/history')
    transactions.value = data
  } catch(e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

const filteredTransactions = computed(() => {
  let result = transactions.value
  
  if (filterType.value) {
    result = result.filter(tx => tx.transactionType === filterType.value)
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(tx => 
      tx.user.firstName.toLowerCase().includes(q) ||
      tx.user.lastName.toLowerCase().includes(q) ||
      tx.bookCopy.book.title.toLowerCase().includes(q) ||
      tx.bookCopy.barcode.toLowerCase().includes(q)
    )
  }
  
  return result
})
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <DocumentTextIcon class="w-6 h-6 text-[#447794]" /> Transaction History
        </h1>
        <p class="text-sm text-slate-500 mt-1">Complete log of all library transactions</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search by user, book title, or barcode..." 
          class="input pl-10 w-full"
        />
      </div>
      <div class="flex items-center gap-2">
        <FunnelIcon class="w-5 h-5 text-slate-400" />
        <select v-model="filterType" class="input min-w-[160px]">
          <option value="">All Types</option>
          <option value="checkout">Checkout</option>
          <option value="return">Return</option>
          <option value="renewal">Renewal</option>
          <option value="lost">Lost</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div v-if="loading" class="text-center py-12 text-slate-500">Loading history...</div>
    <div v-else class="card overflow-x-auto">
      <table class="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
            <th class="px-6 py-4 font-semibold">Date</th>
            <th class="px-6 py-4 font-semibold">User</th>
            <th class="px-6 py-4 font-semibold">Item</th>
            <th class="px-6 py-4 font-semibold">Type</th>
            <th class="px-6 py-4 font-semibold">Status</th>
            <th class="px-6 py-4 font-semibold">Processed By</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="tx in filteredTransactions" :key="tx.id" class="hover:bg-slate-50/50 transition-colors">
            <td class="px-6 py-4 text-sm text-slate-600">
              {{ new Date(tx.createdAt).toLocaleString() }}
            </td>
            <td class="px-6 py-4">
              <div class="font-medium text-slate-800">{{ tx.user.firstName }} {{ tx.user.lastName }}</div>
              <div class="text-xs text-slate-500">{{ tx.user.institutionalId }}</div>
            </td>
            <td class="px-6 py-4 max-w-[250px]">
              <div class="font-medium text-slate-800 truncate">{{ tx.bookCopy.book.title }}</div>
              <div class="text-xs text-slate-500 font-mono">Barcode: {{ tx.bookCopy.barcode }}</div>
            </td>
            <td class="px-6 py-4">
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                :class="{
                  'bg-blue-100 text-blue-700': tx.transactionType === 'checkout',
                  'bg-emerald-100 text-emerald-700': tx.transactionType === 'return',
                  'bg-purple-100 text-purple-700': tx.transactionType === 'renewal',
                  'bg-rose-100 text-rose-700': tx.transactionType === 'lost'
                }">
                {{ tx.transactionType }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span class="text-xs font-semibold uppercase tracking-wider"
                :class="{
                  'text-blue-600': tx.status === 'active',
                  'text-emerald-600': tx.status === 'returned',
                  'text-rose-600': tx.status === 'overdue'
                }">
                {{ tx.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-slate-600">
              {{ tx.librarian?.firstName }} {{ tx.librarian?.lastName }}
            </td>
          </tr>
          <tr v-if="!filteredTransactions.length">
            <td colspan="6" class="px-6 py-8 text-center text-slate-400 italic">No transactions found matching your criteria.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
