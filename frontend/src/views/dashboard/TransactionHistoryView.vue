<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api/axios'
import { DocumentTextIcon, MagnifyingGlassIcon, FunnelIcon, ArrowsUpDownIcon } from '@heroicons/vue/24/outline'
import DropdownFilter from '@/components/DropdownFilter.vue'

const route = useRoute()
const transactions = ref<any[]>([])
const loading = ref(true)
const searchQuery = ref('')
const filterType = ref('')
const filterStatus = ref(typeof route.query.status === 'string' ? route.query.status : '')
const sortBy = ref('date')
const sortOrder = ref<'ASC'|'DESC'>('DESC')

const typeOptions = [
  { label: 'All Types', value: '' },
  { label: 'Checkout', value: 'checkout' },
  { label: 'Return', value: 'return' },
  { label: 'Renewal', value: 'renewal' },
  { label: 'Lost', value: 'lost' }
]

const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Returned', value: 'returned' },
  { label: 'Lost', value: 'lost' }
]

const sortOptions = [
  { label: 'Date', value: 'date' },
  { label: 'User Name', value: 'user' },
  { label: 'Book Title', value: 'book' }
]

function handleSortChange() {
  if ((sortBy.value === 'user' || sortBy.value === 'book') && sortOrder.value === 'DESC') {
    sortOrder.value = 'ASC'
  } else if (sortBy.value === 'date') {
    sortOrder.value = 'DESC'
  }
}

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

  if (filterStatus.value) {
    result = result.filter(tx => tx.status === filterStatus.value)
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
  
  result = [...result].sort((a, b) => {
    let valA, valB
    if (sortBy.value === 'user') {
      valA = `${a.user.lastName} ${a.user.firstName}`.toLowerCase()
      valB = `${b.user.lastName} ${b.user.firstName}`.toLowerCase()
    } else if (sortBy.value === 'book') {
      valA = a.bookCopy.book.title.toLowerCase()
      valB = b.bookCopy.book.title.toLowerCase()
    } else {
      valA = new Date(a.createdAt).getTime()
      valB = new Date(b.createdAt).getTime()
    }
    
    if (valA < valB) return sortOrder.value === 'ASC' ? -1 : 1
    if (valA > valB) return sortOrder.value === 'ASC' ? 1 : -1
    return 0
  })
  
  return result
})
</script>

<template>
  <div class="space-y-6 w-full max-w-[1600px] mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <DocumentTextIcon class="w-6 h-6 text-[#447794]" /> Transaction History
        </h1>
        <p class="text-sm text-slate-500 mt-1">Complete log of all library transactions</p>
      </div>
    </div>

    <!-- Filters Header Box -->
    <div class="filter-card">
      <div class="relative flex-1 w-full md:w-auto">
        <MagnifyingGlassIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search by user, book title, or barcode..." 
          class="w-full pl-10 pr-4 py-2 bg-slate-50 md:bg-white border border-slate-200/80 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5c726a]/30 focus:border-[#5c726a]"
        />
      </div>
      <div class="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
        <DropdownFilter
          v-model="filterType"
          :options="typeOptions"
          width="w-40"
        />

        <DropdownFilter
          v-model="filterStatus"
          :options="statusOptions"
          width="w-40"
        />
        
        <DropdownFilter
          v-model="sortBy"
          :options="sortOptions"
          @change="handleSortChange"
          width="w-44"
        />
      </div>
    </div>

    <!-- Table -->
    <div v-if="loading" class="table-card p-8 text-center text-slate-500">Loading transaction logs...</div>
    <div v-else-if="filteredTransactions.length === 0" class="table-card py-16 text-center text-slate-400">
      <DocumentTextIcon class="w-12 h-12 mx-auto mb-3 text-slate-300" />
      <p class="font-medium text-slate-500">No transactions found</p>
    </div>
    <div v-else class="table-card overflow-x-auto">
      <table class="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr>
            <th class="table-header text-left">Date</th>
            <th class="table-header text-left">User</th>
            <th class="table-header text-left">Item</th>
            <th class="table-header text-left">Type</th>
            <th class="table-header text-left">Status</th>
            <th class="table-header text-left pr-6">Processed By</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in filteredTransactions" :key="tx.id" class="table-row">
            <td class="table-cell text-xs font-mono text-slate-400">
              {{ new Date(tx.createdAt).toLocaleString() }}
            </td>
            <td class="table-cell">
              <div class="font-bold text-slate-800 text-sm">{{ tx.user.firstName }} {{ tx.user.lastName }}</div>
              <div class="text-xs text-slate-400">{{ tx.user.institutionalId }}</div>
            </td>
            <td class="table-cell max-w-[280px]">
              <div class="font-bold text-slate-800 text-sm truncate">{{ tx.bookCopy.book.title }}</div>
              <div class="text-xs text-slate-400 font-mono">Barcode: {{ tx.bookCopy.barcode }}</div>
            </td>
            <td class="table-cell">
              <span class="badge-pill-sky capitalize" v-if="tx.transactionType === 'checkout'">Checkout</span>
              <span class="badge-pill-green capitalize" v-else-if="tx.transactionType === 'return'">Return</span>
              <span class="badge-pill-purple capitalize" v-else-if="tx.transactionType === 'renewal'">Renewal</span>
              <span class="badge-pill-rose capitalize" v-else-if="tx.transactionType === 'lost'">Lost</span>
              <span class="badge-pill-gray capitalize" v-else>{{ tx.transactionType }}</span>
            </td>
            <td class="table-cell">
              <span class="badge-pill-sky capitalize" v-if="tx.status === 'active'">Active</span>
              <span class="badge-pill-green capitalize" v-else-if="tx.status === 'returned'">Returned</span>
              <span class="badge-pill-rose capitalize" v-else-if="tx.status === 'overdue'">Overdue</span>
              <span class="badge-pill-gray capitalize" v-else>{{ tx.status }}</span>
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
