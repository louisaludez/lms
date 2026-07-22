<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { format, subDays, startOfMonth } from 'date-fns'
import api from '@/api/axios'
import { useRouter } from 'vue-router'
import {
  ClipboardDocumentListIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowPathIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()

const logs = ref<any[]>([])
const stats = ref({ entries: 0, exits: 0, total: 0 })
const loading = ref(false)

// Filters
const startDate = ref('')
const endDate = ref('')
const entryType = ref<'all' | 'entry' | 'exit'>('all')
const searchQuery = ref('')
const selectedPreset = ref<string>('today')

// Format date helper for input YYYY-MM-DD
function formatDateForInput(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

// Set default initial preset to 'today'
const todayStr = formatDateForInput(new Date())
startDate.value = todayStr
endDate.value = todayStr

// Preset Handlers
function applyPreset(preset: string) {
  selectedPreset.value = preset
  const today = new Date()

  if (preset === 'today') {
    startDate.value = formatDateForInput(today)
    endDate.value = formatDateForInput(today)
  } else if (preset === 'yesterday') {
    const yest = subDays(today, 1)
    startDate.value = formatDateForInput(yest)
    endDate.value = formatDateForInput(yest)
  } else if (preset === 'last_7') {
    startDate.value = formatDateForInput(subDays(today, 6))
    endDate.value = formatDateForInput(today)
  } else if (preset === 'this_month') {
    startDate.value = formatDateForInput(startOfMonth(today))
    endDate.value = formatDateForInput(today)
  } else if (preset === 'all_time') {
    startDate.value = ''
    endDate.value = ''
  }
  fetchAttendanceData()
}

async function fetchAttendanceData() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    if (entryType.value !== 'all') params.entryType = entryType.value
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim()

    const [logsRes, statsRes] = await Promise.all([
      api.get('/attendance/logs', { params }),
      api.get('/attendance/stats', { params }),
    ])
    logs.value = logsRes.data
    stats.value = statsRes.data
  } catch (err) {
    console.error('Failed to load attendance logs:', err)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  const today = new Date()
  startDate.value = formatDateForInput(today)
  endDate.value = formatDateForInput(today)
  entryType.value = 'all'
  searchQuery.value = ''
  selectedPreset.value = 'today'
  fetchAttendanceData()
}

// Debounce timer for search
let searchDebounce: number | null = null
function handleSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = window.setTimeout(() => {
    fetchAttendanceData()
  }, 300)
}

function handleDateChange() {
  selectedPreset.value = 'custom'
  fetchAttendanceData()
}

onMounted(() => {
  fetchAttendanceData()
})

function formatLogDateTime(dt: string) {
  try {
    return format(new Date(dt), 'MMM dd, yyyy · hh:mm a')
  } catch {
    return dt
  }
}

// Display active date range label
const dateRangeLabel = computed(() => {
  if (startDate.value && endDate.value) {
    if (startDate.value === endDate.value) {
      try { return format(new Date(startDate.value), 'MMM dd, yyyy') } catch { return startDate.value }
    }
    try {
      return `${format(new Date(startDate.value), 'MMM dd, yyyy')} – ${format(new Date(endDate.value), 'MMM dd, yyyy')}`
    } catch {
      return `${startDate.value} to ${endDate.value}`
    }
  } else if (startDate.value) {
    try { return `From ${format(new Date(startDate.value), 'MMM dd, yyyy')}` } catch { return startDate.value }
  } else if (endDate.value) {
    try { return `Until ${format(new Date(endDate.value), 'MMM dd, yyyy')}` } catch { return endDate.value }
  }
  return 'All Time'
})
</script>

<template>
  <div class="space-y-6 w-full max-w-[1600px] mx-auto p-2 md:p-4">
    <!-- Top Header & Action Row -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
      <div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#447794]/10 text-[#447794] flex items-center justify-center font-bold">
            <ClipboardDocumentListIcon class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-800 tracking-tight">Attendance Logs & Kiosk</h1>
            <p class="text-xs text-slate-500 mt-0.5">Track entry and exit records with customizable date range filters.</p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="fetchAttendanceData"
          class="btn-secondary px-4 py-2.5 text-sm flex items-center gap-2 text-slate-600 hover:text-slate-900 border border-slate-200"
          :disabled="loading"
        >
          <ArrowPathIcon :class="['w-4 h-4', { 'animate-spin': loading }]" />
          <span>Refresh</span>
        </button>

        <button
          @click="router.push('/kiosk/attendance')"
          class="btn-primary px-5 py-2.5 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-[#447794]/25 hover:shadow-xl transition-all"
        >
          <span>Launch Full-Screen Kiosk</span>
          <ArrowTopRightOnSquareIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Metric Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- Total Entries Card -->
      <div class="card p-5 border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Entries</span>
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ArrowDownRightIcon class="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>
        <div class="mt-3">
          <p class="text-3xl font-extrabold text-slate-900 tracking-tight">{{ stats.entries.toLocaleString() }}</p>
          <p class="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <CalendarIcon class="w-3.5 h-3.5 text-slate-400" />
            <span>{{ dateRangeLabel }}</span>
          </p>
        </div>
      </div>

      <!-- Total Exits Card -->
      <div class="card p-5 border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Exits</span>
          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <ArrowUpRightIcon class="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>
        <div class="mt-3">
          <p class="text-3xl font-extrabold text-slate-900 tracking-tight">{{ stats.exits.toLocaleString() }}</p>
          <p class="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <CalendarIcon class="w-3.5 h-3.5 text-slate-400" />
            <span>{{ dateRangeLabel }}</span>
          </p>
        </div>
      </div>

      <!-- Combined Total Activity Card -->
      <div class="card p-5 border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Activity Scans</span>
          <div class="w-10 h-10 rounded-xl bg-[#447794]/10 text-[#447794] flex items-center justify-center font-bold">
            <ClockIcon class="w-5 h-5 stroke-[2]" />
          </div>
        </div>
        <div class="mt-3">
          <p class="text-3xl font-extrabold text-slate-900 tracking-tight">{{ (stats.total || (stats.entries + stats.exits)).toLocaleString() }}</p>
          <p class="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <FunnelIcon class="w-3.5 h-3.5 text-slate-400" />
            <span>{{ logs.length }} records shown</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Filter Toolbar Section -->
    <div class="card p-5 border border-slate-100 shadow-xs space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <FunnelIcon class="w-4 h-4 text-[#447794]" />
          <span>Filter Attendance Records</span>
        </div>
        <button
          v-if="startDate || endDate || entryType !== 'all' || searchQuery"
          @click="resetFilters"
          class="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1 transition"
        >
          <XMarkIcon class="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>

      <!-- Controls Grid -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
        <!-- Search Keyword -->
        <div class="md:col-span-4 relative">
          <label class="block text-xs font-medium text-slate-500 mb-1">Search User / Barcode / Dept</label>
          <div class="relative">
            <MagnifyingGlassIcon class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchQuery"
              @input="handleSearchInput"
              type="text"
              placeholder="Filter by student name, ID or dept..."
              class="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#447794]/20 focus:border-[#447794] outline-none transition"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''; fetchAttendanceData()"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Date Range: Start Date -->
        <div class="md:col-span-3">
          <label class="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
          <div class="relative">
            <input
              v-model="startDate"
              @change="handleDateChange"
              type="date"
              class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#447794]/20 focus:border-[#447794] outline-none text-slate-700 font-medium"
            />
          </div>
        </div>

        <!-- Date Range: End Date -->
        <div class="md:col-span-3">
          <label class="block text-xs font-medium text-slate-500 mb-1">End Date</label>
          <div class="relative">
            <input
              v-model="endDate"
              @change="handleDateChange"
              type="date"
              class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#447794]/20 focus:border-[#447794] outline-none text-slate-700 font-medium"
            />
          </div>
        </div>

        <!-- Entry Type Dropdown -->
        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-slate-500 mb-1">Entry Type</label>
          <select
            v-model="entryType"
            @change="fetchAttendanceData"
            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#447794]/20 focus:border-[#447794] outline-none text-slate-700 font-medium bg-white"
          >
            <option value="all">All Types</option>
            <option value="entry">Entry Only</option>
            <option value="exit">Exit Only</option>
          </select>
        </div>
      </div>

      <!-- Quick Preset Buttons -->
      <div class="flex items-center gap-2 flex-wrap pt-1">
        <span class="text-xs font-semibold text-slate-400 mr-1">Quick Presets:</span>
        
        <button
          @click="applyPreset('today')"
          :class="[
            'px-3 py-1 text-xs rounded-lg font-medium transition-all',
            selectedPreset === 'today'
              ? 'bg-[#447794] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          ]"
        >
          Today
        </button>

        <button
          @click="applyPreset('yesterday')"
          :class="[
            'px-3 py-1 text-xs rounded-lg font-medium transition-all',
            selectedPreset === 'yesterday'
              ? 'bg-[#447794] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          ]"
        >
          Yesterday
        </button>

        <button
          @click="applyPreset('last_7')"
          :class="[
            'px-3 py-1 text-xs rounded-lg font-medium transition-all',
            selectedPreset === 'last_7'
              ? 'bg-[#447794] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          ]"
        >
          Last 7 Days
        </button>

        <button
          @click="applyPreset('this_month')"
          :class="[
            'px-3 py-1 text-xs rounded-lg font-medium transition-all',
            selectedPreset === 'this_month'
              ? 'bg-[#447794] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          ]"
        >
          This Month
        </button>

        <button
          @click="applyPreset('all_time')"
          :class="[
            'px-3 py-1 text-xs rounded-lg font-medium transition-all',
            selectedPreset === 'all_time'
              ? 'bg-[#447794] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          ]"
        >
          All Time
        </button>
      </div>
    </div>

    <!-- Main Attendance Logs Table -->
    <div class="card overflow-hidden border border-slate-100 dark:border-slate-700/60 shadow-xs">
      <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/50 dark:bg-[#1E293B]">
        <div class="flex items-center gap-2">
          <UserCircleIcon class="w-5 h-5 text-[#6B131D] dark:text-rose-400" />
          <h2 class="font-bold text-slate-800 dark:text-slate-100">Attendance Log Entries</h2>
          <span class="px-2.5 py-0.5 text-xs font-semibold bg-[#6B131D]/10 dark:bg-rose-950/60 text-[#6B131D] dark:text-rose-400 rounded-full">
            {{ logs.length }} {{ logs.length === 1 ? 'record' : 'records' }}
          </span>
        </div>

        <span class="text-xs text-slate-400 dark:text-slate-400">
          Showing results for <strong class="text-slate-600 dark:text-slate-200">{{ dateRangeLabel }}</strong>
        </span>
      </div>

      <!-- Table Body -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/80 dark:bg-[#182234] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/60">
              <th class="px-6 py-3.5">User Info</th>
              <th class="px-6 py-3.5">Department</th>
              <th class="px-6 py-3.5 text-center">Type</th>
              <th class="px-6 py-3.5">Purpose / Notes</th>
              <th class="px-6 py-3.5 text-right">Scanned Date & Time</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            <!-- Loading Skeleton -->
            <template v-if="loading">
              <tr v-for="i in 5" :key="i" class="animate-pulse">
                <td class="px-6 py-4"><div class="h-4 bg-slate-100 rounded-md w-36"></div></td>
                <td class="px-6 py-4"><div class="h-4 bg-slate-100 rounded-md w-24"></div></td>
                <td class="px-6 py-4 text-center"><div class="h-5 bg-slate-100 rounded-full w-16 mx-auto"></div></td>
                <td class="px-6 py-4"><div class="h-4 bg-slate-100 rounded-md w-20"></div></td>
                <td class="px-6 py-4 text-right"><div class="h-4 bg-slate-100 rounded-md w-32 ml-auto"></div></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="logs.length === 0">
              <td colspan="5" class="py-12 text-center">
                <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <ClipboardDocumentListIcon class="w-6 h-6" />
                </div>
                <p class="text-slate-700 font-semibold text-base">No attendance logs found</p>
                <p class="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                  Try adjusting your start/end date filters or search terms to find attendance entries.
                </p>
                <button
                  @click="resetFilters"
                  class="mt-4 text-xs font-semibold text-[#447794] hover:underline"
                >
                  Reset filters to today
                </button>
              </td>
            </tr>

            <!-- Log Rows -->
            <tr
              v-else
              v-for="log in logs"
              :key="log.id"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <!-- User Info -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-[#447794]/10 text-[#447794] font-bold flex items-center justify-center text-xs flex-shrink-0">
                    {{ log.user?.firstName?.[0] ?? '' }}{{ log.user?.lastName?.[0] ?? '' }}
                  </div>
                  <div>
                    <p class="font-semibold text-slate-800">
                      {{ log.user?.firstName }} {{ log.user?.lastName }}
                    </p>
                    <p class="text-xs text-slate-400 font-mono">
                      {{ log.user?.barcode ?? 'N/A' }} · {{ log.user?.email ?? '' }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Department -->
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                  {{ log.user?.department?.name ?? log.user?.department?.code ?? 'General' }}
                </span>
              </td>

              <!-- Type Badge -->
              <td class="px-6 py-4 text-center">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                    log.entryType === 'entry'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-indigo-100 text-indigo-700'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', log.entryType === 'entry' ? 'bg-emerald-500' : 'bg-indigo-500']" />
                  {{ log.entryType }}
                </span>
              </td>

              <!-- Purpose -->
              <td class="px-6 py-4 text-slate-600 text-xs">
                {{ log.purpose || (log.entryType === 'entry' ? 'Library Visit' : 'Exit') }}
              </td>

              <!-- Scanned Date & Time -->
              <td class="px-6 py-4 text-right">
                <div class="text-xs font-medium text-slate-700">
                  {{ formatLogDateTime(log.scannedAt) }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
