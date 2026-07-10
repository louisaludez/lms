<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useLibraryStore } from '@/stores/useLibraryStore'
import {
  BookOpenIcon, ArrowsRightLeftIcon, ExclamationTriangleIcon,
  CheckCircleIcon, UserGroupIcon, ChartPieIcon
} from '@heroicons/vue/24/outline'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'vue-chartjs'

ChartJS.register(ArcElement, Tooltip, Legend)

const store = useLibraryStore()
onMounted(() => store.fetchStats())

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

      <div class="stat-card">
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

    <!-- Overdue alert -->
    <div v-if="store.txStats.overdue > 0" class="rounded-2xl bg-rose-50 border border-rose-200 p-5 flex gap-4">
      <ExclamationTriangleIcon class="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
      <div>
        <p class="font-semibold text-rose-800">{{ store.txStats.overdue }} overdue item(s) require attention</p>
        <p class="text-rose-600 text-sm mt-0.5">
          The daily CRON job will automatically flag these at midnight and suspend the respective accounts.
          You can also manually trigger it from <code class="bg-rose-100 px-1 rounded">Admin → CRON</code>.
        </p>
      </div>
    </div>

    <!-- System Overview Charts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card p-6">
        <h2 class="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <BookOpenIcon class="w-5 h-5 text-[#447794]" />
          Inventory Status
        </h2>
        <div class="h-64 flex items-center justify-center relative">
          <Doughnut
            v-if="store.stats.totalCopies > 0"
            :data="inventoryData"
            :options="chartOptions"
          />
          <div v-else class="text-slate-400 text-sm flex flex-col items-center">
            <ChartPieIcon class="w-10 h-10 mb-2 opacity-50" />
            No inventory data
          </div>
          <!-- Center Text -->
          <div v-if="store.stats.totalCopies > 0" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span class="text-3xl font-bold text-slate-800">{{ store.stats.totalCopies }}</span>
            <span class="text-xs text-slate-500 font-medium">Total Copies</span>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <h2 class="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <ArrowsRightLeftIcon class="w-5 h-5 text-[#447794]" />
          Current Borrowings
        </h2>
        <div class="h-64 flex items-center justify-center relative">
          <Doughnut
            v-if="(store.txStats.active + store.txStats.overdue) > 0"
            :data="borrowingData"
            :options="chartOptions"
          />
          <div v-else class="text-slate-400 text-sm flex flex-col items-center">
            <ChartPieIcon class="w-10 h-10 mb-2 opacity-50" />
            No active borrowings
          </div>
          <div v-if="(store.txStats.active + store.txStats.overdue) > 0" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span class="text-3xl font-bold text-slate-800">{{ store.txStats.active + store.txStats.overdue }}</span>
            <span class="text-xs text-slate-500 font-medium">Total Active</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
