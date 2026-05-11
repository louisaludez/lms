<script setup lang="ts">
import { onMounted } from 'vue'
import { useLibraryStore } from '@/stores/useLibraryStore'
import {
  BookOpenIcon, ArrowsRightLeftIcon, ExclamationTriangleIcon,
  CheckCircleIcon, UserGroupIcon,
} from '@heroicons/vue/24/outline'

const store = useLibraryStore()
onMounted(() => store.fetchStats())
</script>

<template>
  <div class="space-y-6">
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

    <!-- Quick info -->
    <div class="card p-6">
      <h2 class="font-semibold text-slate-700 mb-4">System Overview</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <p class="text-slate-500 text-xs mb-1">Total Copies</p>
          <p class="font-bold text-slate-800 text-xl">{{ store.stats.totalCopies }}</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <p class="text-slate-500 text-xs mb-1">Returned Today</p>
          <p class="font-bold text-slate-800 text-xl">{{ store.txStats.returnedToday }}</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <p class="text-slate-500 text-xs mb-1">Overdue Rate</p>
          <p class="font-bold text-slate-800 text-xl">
            {{
              store.txStats.active + store.txStats.overdue > 0
                ? Math.round((store.txStats.overdue / (store.txStats.active + store.txStats.overdue)) * 100)
                : 0
            }}%
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
