<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/useLibraryStore'
import api from '@/api/axios'
import {
  BookOpenIcon, ArrowsRightLeftIcon, ExclamationTriangleIcon,
  CheckCircleIcon, UserGroupIcon, ChartPieIcon, ArrowRightIcon,
  ArrowPathIcon, DocumentTextIcon, BuildingOfficeIcon, ChartBarIcon
} from '@heroicons/vue/24/outline'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const router = useRouter()
const store = useLibraryStore()

const overdueItems = ref<any[]>([])
const loadingOverdue = ref(false)

const departmentEntryData = ref<any[]>([])
const loadingDeptEntry = ref(false)

async function fetchOverdueItems() {
  loadingOverdue.value = true
  try {
    const { data } = await api.get('/transactions/overdue')
    overdueItems.value = data
  } catch (e) {
    console.error('Failed to fetch overdue items', e)
  } finally {
    loadingOverdue.value = false
  }
}

async function fetchDepartmentEntry() {
  loadingDeptEntry.value = true
  try {
    const { data } = await api.get('/reports/department-entry')
    departmentEntryData.value = data
  } catch (e) {
    console.error('Failed to fetch department entry stats', e)
  } finally {
    loadingDeptEntry.value = false
  }
}

onMounted(() => {
  store.fetchStats()
  fetchOverdueItems()
  fetchDepartmentEntry()
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: { family: "'Inter', sans-serif", size: 12 }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      padding: 12,
      cornerRadius: 8,
    }
  }
}

const inventoryData = computed(() => {
  const checkedOut = store.stats.totalCopies - store.stats.availableCopies
  return {
    labels: ['Available', 'Checked Out'],
    datasets: [{
      data: [store.stats.availableCopies, checkedOut],
      backgroundColor: ['#10b981', '#f59e0b'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  }
})

const borrowingData = computed(() => {
  const onTime = store.txStats.active
  const overdue = store.txStats.overdue
  return {
    labels: ['Active (On Time)', 'Overdue'],
    datasets: [{
      data: [onTime, overdue],
      backgroundColor: ['#0ea5e9', '#f43f5e'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  }
})

const departmentChartData = computed(() => {
  const labels = departmentEntryData.value.map(d => d.code || d.name)
  const counts = departmentEntryData.value.map(d => Number(d.entryCount || 0))

  return {
    labels,
    datasets: [
      {
        label: 'Library Entries',
        data: counts,
        backgroundColor: '#447794',
        hoverBackgroundColor: '#335c73',
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 48,
      }
    ]
  }
})

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        title: (items: any) => {
          if (!items.length) return ''
          const index = items[0].dataIndex
          const dept = departmentEntryData.value[index]
          return dept ? `${dept.code} - ${dept.name}` : items[0].label
        },
        label: (item: any) => ` Entries: ${item.raw}`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { family: "'Inter', sans-serif", size: 12, weight: 'bold' as const },
        color: '#64748b'
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        font: { family: "'Inter', sans-serif", size: 11 },
        color: '#94a3b8'
      },
      grid: {
        color: '#f1f5f9'
      }
    }
  }
}

function goToOverdueTransactions() {
  router.push({ path: '/dashboard/transactions', query: { status: 'overdue' } })
}

function processReturnForCopy(barcode: string) {
  router.push({ path: '/dashboard/circulation', query: { returnBarcode: barcode } })
}
</script>

<template>
  <div class="space-y-6 w-full max-w-[1600px] mx-auto">
    <!-- Stat Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="stat-icon bg-[#447794]">
          <BookOpenIcon class="w-6 h-6" />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-800">{{ store.stats.totalBooks }}</p>
          <p class="text-xs text-slate-500 font-medium">Total Titles</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon bg-emerald-500">
          <CheckCircleIcon class="w-6 h-6" />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-800">{{ store.stats.availableCopies }}</p>
          <p class="text-xs text-slate-500 font-medium">Available Copies</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon bg-sky-500">
          <ArrowsRightLeftIcon class="w-6 h-6" />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-800">{{ store.txStats.active }}</p>
          <p class="text-xs text-slate-500 font-medium">Active Borrows</p>
        </div>
      </div>

      <div 
        @click="goToOverdueTransactions"
        class="stat-card cursor-pointer hover:border-rose-300 transition-all"
        :title="'Click to view overdue transactions'"
      >
        <div class="stat-icon" :class="store.txStats.overdue > 0 ? 'bg-rose-500' : 'bg-slate-400'">
          <ExclamationTriangleIcon class="w-6 h-6" />
        </div>
        <div>
          <p class="text-2xl font-bold" :class="store.txStats.overdue > 0 ? 'text-rose-600' : 'text-slate-800'">
            {{ store.txStats.overdue }}
          </p>
          <p class="text-xs text-slate-500 font-medium">Overdue Items</p>
        </div>
      </div>
    </div>

    <!-- Overdue Alert Banner -->
    <div v-if="store.txStats.overdue > 0" class="rounded-2xl bg-rose-50 border border-rose-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex gap-4">
        <ExclamationTriangleIcon class="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
        <div>
          <p class="font-semibold text-rose-800">{{ store.txStats.overdue }} overdue item(s) require attention</p>
          <p class="text-rose-600 text-sm mt-0.5">
            Borrowers with overdue items must return them at the counter to restore borrowing privileges.
          </p>
        </div>
      </div>
      <button 
        @click="goToOverdueTransactions"
        class="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
      >
        View Overdue History
        <ArrowRightIcon class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Overdue Items List Table Section -->
    <div v-if="store.txStats.overdue > 0 || overdueItems.length > 0" class="table-card p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-slate-800 flex items-center gap-2 text-base">
          <ExclamationTriangleIcon class="w-5 h-5 text-rose-500" />
          Overdue Items Requiring Attention
          <span class="badge-pill-rose text-xs px-2.5 py-0.5">{{ overdueItems.length }}</span>
        </h2>
        <button 
          @click="fetchOverdueItems" 
          class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh overdue list"
        >
          <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': loadingOverdue }" />
        </button>
      </div>

      <div v-if="loadingOverdue" class="py-8 text-center text-slate-400 text-sm">Loading overdue items...</div>
      <div v-else-if="overdueItems.length === 0" class="py-8 text-center text-slate-400 italic text-sm">
        No active overdue items.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th class="table-header text-left">Borrower</th>
              <th class="table-header text-left">Book / Copy</th>
              <th class="table-header text-left">Due Date</th>
              <th class="table-header text-left">Overdue Status</th>
              <th class="table-header text-right">Fine</th>
              <th class="table-header text-center pr-6">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in overdueItems" :key="tx.id" class="table-row">
              <td class="table-cell">
                <div class="font-bold text-slate-800 text-sm">{{ tx.user?.firstName }} {{ tx.user?.lastName }}</div>
                <div class="text-xs text-slate-400 font-mono">{{ tx.user?.institutionalId || tx.user?.barcode }}</div>
              </td>
              <td class="table-cell max-w-[260px]">
                <div class="font-bold text-slate-800 text-sm truncate">{{ tx.bookCopy?.book?.title }}</div>
                <div class="text-xs text-slate-400 font-mono">Barcode: {{ tx.bookCopy?.barcode }}</div>
              </td>
              <td class="table-cell text-xs font-mono text-slate-600">
                {{ tx.dueDate }}
              </td>
              <td class="table-cell">
                <span class="badge-pill-rose font-medium text-xs">
                  {{ tx.overdueDays }} day(s) overdue
                </span>
              </td>
              <td class="table-cell text-right font-bold text-rose-600 text-sm">
                ₱{{ Number(tx.fineAmount || 0).toFixed(2) }}
              </td>
              <td class="table-cell text-center pr-6">
                <button
                  @click="processReturnForCopy(tx.bookCopy?.barcode)"
                  class="inline-flex items-center gap-1 px-3 py-1.5 bg-[#447794] hover:bg-[#335c73] text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                >
                  <ArrowsRightLeftIcon class="w-3.5 h-3.5" />
                  Return Book
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- System Overview Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Department Entry Bar Chart -->
      <div class="card p-6 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-[#447794]/10 rounded-xl text-[#447794]">
              <BuildingOfficeIcon class="w-6 h-6" />
            </div>
            <div>
              <h2 class="font-bold text-slate-800 text-lg leading-tight">Department Entry</h2>
              <p class="text-xs text-slate-500 font-medium">Most active departments by volume</p>
            </div>
          </div>
          <button 
            @click="fetchDepartmentEntry" 
            class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh department stats"
          >
            <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': loadingDeptEntry }" />
          </button>
        </div>

        <div class="h-64 flex items-center justify-center relative">
          <Bar
            v-if="departmentEntryData.length > 0"
            :data="departmentChartData"
            :options="barChartOptions"
          />
          <div v-else-if="loadingDeptEntry" class="text-slate-400 text-sm py-12">
            Loading department entry data...
          </div>
          <div v-else class="text-slate-400 text-sm flex flex-col items-center">
            <ChartBarIcon class="w-10 h-10 mb-2 opacity-50" />
            No department entry data available
          </div>
        </div>
      </div>

      <!-- Quick Inventory & Borrowing Stats Grid -->
      <div class="grid grid-cols-1 gap-6 lg:col-span-1">
        <div class="card p-6">
          <h2 class="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-sm">
            <BookOpenIcon class="w-4 h-4 text-[#447794]" />
            Inventory Status
          </h2>
          <div class="h-44 flex items-center justify-center relative">
            <Doughnut
              v-if="store.stats.totalCopies > 0"
              :data="inventoryData"
              :options="chartOptions"
            />
            <div v-else class="text-slate-400 text-xs flex flex-col items-center">
              <ChartPieIcon class="w-8 h-8 mb-1 opacity-50" />
              No inventory data
            </div>
            <div v-if="store.stats.totalCopies > 0" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span class="text-xl font-bold text-slate-800">{{ store.stats.totalCopies }}</span>
              <span class="text-[10px] text-slate-500 font-medium">Total Copies</span>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <h2 class="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-sm">
            <ArrowsRightLeftIcon class="w-4 h-4 text-[#447794]" />
            Current Borrowings
          </h2>
          <div class="h-44 flex items-center justify-center relative">
            <Doughnut
              v-if="(store.txStats.active + store.txStats.overdue) > 0"
              :data="borrowingData"
              :options="chartOptions"
            />
            <div v-else class="text-slate-400 text-xs flex flex-col items-center">
              <ChartPieIcon class="w-8 h-8 mb-1 opacity-50" />
              No active borrowings
            </div>
            <div v-if="(store.txStats.active + store.txStats.overdue) > 0" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span class="text-xl font-bold text-slate-800">{{ store.txStats.active + store.txStats.overdue }}</span>
              <span class="text-[10px] text-slate-500 font-medium">Total Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
