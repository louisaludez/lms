<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/api/axios'
import { PrinterIcon, ChartBarIcon, DocumentChartBarIcon, UsersIcon, BuildingOfficeIcon, BookOpenIcon } from '@heroicons/vue/24/outline'

import { Bar, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const highDemand = ref<any[]>([])
const deptBorrowing = ref<any[]>([])
const visitorStats = ref<any[]>([])
const bookReqStats = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [req1, req2, req3, req4] = await Promise.all([
      api.get('/reports/high-demand'),
      api.get('/reports/department-borrowing'),
      api.get('/reports/visitor-statistics'),
      api.get('/reports/book-requests')
    ])
    highDemand.value = req1.data
    deptBorrowing.value = req2.data
    visitorStats.value = req3.data
    bookReqStats.value = req4.data
  } catch(e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

const totalVisitors = computed(() => {
  return visitorStats.value.reduce((acc, v) => acc + Number(v.visitorCount), 0)
})

function printReport() {
  window.print()
}

const deptChartData = computed(() => {
  const chartColors = [
    '#447794', '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#14B8A6'
  ]
  return {
    labels: deptBorrowing.value.map(d => d.code),
    datasets: [
      {
        label: 'Total Borrows',
        backgroundColor: deptBorrowing.value.map((_, i) => chartColors[i % chartColors.length]),
        borderRadius: 4,
        data: deptBorrowing.value.map(d => Number(d.borrowCount))
      }
    ]
  }
})

const deptChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  }
}

const visitorChartData = computed(() => {
  return {
    labels: visitorStats.value.map(v => v.gender),
    datasets: [
      {
        backgroundColor: ['#6366F1', '#EC4899', '#10B981'],
        borderWidth: 0,
        data: visitorStats.value.map(v => Number(v.visitorCount))
      }
    ]
  }
})

const visitorChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const
    }
  },
  cutout: '70%'
}

const bookReqChartData = computed(() => {
  const statusColors: Record<string, string> = {
    'pending': '#F59E0B',
    'approved': '#3B82F6',
    'rejected': '#EF4444',
    'fulfilled': '#10B981'
  }
  return {
    labels: bookReqStats.value.map(s => s.status.charAt(0).toUpperCase() + s.status.slice(1)),
    datasets: [
      {
        backgroundColor: bookReqStats.value.map(s => statusColors[s.status] || '#94A3B8'),
        borderWidth: 0,
        data: bookReqStats.value.map(s => Number(s.count))
      }
    ]
  }
})

const totalBookReqs = computed(() => bookReqStats.value.reduce((acc, s) => acc + Number(s.count), 0))
</script>

<template>
  <div class="reports-container space-y-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hide-on-print mb-8">
      <div>
        <h1 class="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <ChartBarIcon class="w-8 h-8 text-[#447794]" /> Library Analytics
        </h1>
        <p class="text-sm text-slate-500 mt-1">Comprehensive statistical reports and insights</p>
      </div>
      <button @click="printReport" class="btn-primary shadow-lg shadow-[#447794]/20 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95">
        <PrinterIcon class="w-5 h-5" /> Print Report
      </button>
    </div>

    <!-- Print Header -->
    <div class="hidden print:block text-center mb-10 border-b-2 border-slate-800 pb-6">
      <h1 class="text-4xl font-bold text-slate-900 mb-2">Lumina Library - Analytics Report</h1>
      <p class="text-slate-600 font-medium">Generated on {{ new Date().toLocaleDateString() }} at {{ new Date().toLocaleTimeString() }}</p>
    </div>

    <div v-if="loading" class="text-center py-20 text-slate-500">
      <div class="animate-pulse flex flex-col items-center">
        <ChartBarIcon class="w-12 h-12 text-slate-300 mb-4" />
        <p class="font-medium">Loading reports...</p>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block print:space-y-8">
      
      <!-- High Demand / Low Stock -->
      <div class="card p-6 lg:col-span-3 print-section">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
            <DocumentChartBarIcon class="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-800">High Demand / Low Stock</h2>
            <p class="text-sm text-slate-500">Items frequently borrowed with low availability</p>
          </div>
        </div>
        
        <div class="overflow-x-auto print:overflow-visible">
          <table class="w-full text-left border-collapse min-w-[600px] print:min-w-full">
            <thead>
              <tr class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th class="px-4 py-3 font-semibold rounded-tl-xl">Item Title</th>
                <th class="px-4 py-3 font-semibold">ISBN</th>
                <th class="px-4 py-3 font-semibold text-right">Available Copies</th>
                <th class="px-4 py-3 font-semibold text-right rounded-tr-xl">Total Borrows</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in highDemand" :key="item.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-4 py-3 font-medium text-slate-800">{{ item.title }}</td>
                <td class="px-4 py-3 font-mono text-sm text-slate-500">{{ item.isbn }}</td>
                <td class="px-4 py-3 text-right">
                  <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold"
                        :class="Number(item.availableCopies) <= 1 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'">
                    {{ item.availableCopies }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right font-bold text-[#447794]">{{ item.borrowCount }}</td>
              </tr>
              <tr v-if="!highDemand.length">
                <td colspan="4" class="px-4 py-8 text-center text-slate-400 italic">No data available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Department Borrowing Chart -->
      <div class="card p-6 print-section h-full flex flex-col">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="w-12 h-12 rounded-2xl bg-[#447794]/10 flex items-center justify-center">
            <BuildingOfficeIcon class="w-6 h-6 text-[#447794]" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-800">Department Borrowing</h2>
            <p class="text-sm text-slate-500">Most active departments by volume</p>
          </div>
        </div>

        <div class="flex-1 min-h-[300px] print:min-h-[400px] flex items-center justify-center">
          <Bar v-if="deptBorrowing.length" :data="deptChartData" :options="deptChartOptions" />
          <div v-else class="text-slate-400 italic">No data available</div>
        </div>
      </div>

      <!-- Visitor Statistics Chart -->
      <div class="card p-6 print-section h-full flex flex-col">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <UsersIcon class="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-800">Visitor Statistics</h2>
            <p class="text-sm text-slate-500">Breakdown of library entrants by gender</p>
          </div>
        </div>

        <div class="flex-1 min-h-[300px] print:min-h-[400px] flex flex-col items-center justify-center relative">
          <Doughnut v-if="visitorStats.length" :data="visitorChartData" :options="visitorChartOptions" />
          <div v-if="visitorStats.length" class="absolute inset-0 flex items-center justify-center pointer-events-none mt-[-20px]">
             <div class="text-center">
               <div class="text-3xl font-black text-slate-800">{{ totalVisitors }}</div>
               <div class="text-xs font-semibold text-slate-400 uppercase tracking-widest">Entrants</div>
             </div>
          </div>
          <div v-else class="text-slate-400 italic">No data available</div>
        </div>
      </div>

      <!-- Book Requests Chart -->
      <div class="card p-6 print-section h-full flex flex-col">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
            <BookOpenIcon class="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-800">Book Requests</h2>
            <p class="text-sm text-slate-500">Breakdown of book requests by status</p>
          </div>
        </div>

        <div class="flex-1 min-h-[300px] print:min-h-[400px] flex flex-col items-center justify-center relative">
          <Doughnut v-if="bookReqStats.length" :data="bookReqChartData" :options="visitorChartOptions" />
          <div v-if="bookReqStats.length" class="absolute inset-0 flex items-center justify-center pointer-events-none mt-[-20px]">
             <div class="text-center">
               <div class="text-3xl font-black text-slate-800">{{ totalBookReqs }}</div>
               <div class="text-xs font-semibold text-slate-400 uppercase tracking-widest">Requests</div>
             </div>
          </div>
          <div v-else class="text-slate-400 italic">No data available</div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@media print {
  .hide-on-print {
    display: none !important;
  }
  .reports-container {
    max-width: 100% !important;
    background: white !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .card {
    box-shadow: none !important;
    border: 1px solid #e2e8f0 !important;
    break-inside: avoid;
    margin-bottom: 24px;
    padding: 1.5rem !important;
  }
  .print-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    background: white !important;
  }
}
</style>
