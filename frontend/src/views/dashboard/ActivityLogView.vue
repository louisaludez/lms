<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/axios'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ClockIcon,
  UserCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  XCircleIcon as XCircleIconExport,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()

// State
const loading = ref(false)
const logs = ref<any[]>([])
const stats = ref({
  totalLogs: 0,
  todayLogs: 0,
  thisWeekLogs: 0,
  byAction: {} as Record<string, number>,
  byResource: {} as Record<string, number>,
})
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
})

// Filters
const filters = ref({
  search: '',
  action: '',
  resource: '',
  userId: '',
  startDate: '',
  endDate: '',
  sortBy: 'createdAt',
  sortOrder: 'DESC' as 'ASC' | 'DESC',
})

const showFilters = ref(false)
const showExportModal = ref(false)
const exportFormat = ref<'csv' | 'json'>('csv')

// Action and Resource enums for filter options
const actions = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'borrow', label: 'Borrow' },
  { value: 'return', label: 'Return' },
  { value: 'extend', label: 'Extend' },
  { value: 'reserve', label: 'Reserve' },
  { value: 'cancel_reservation', label: 'Cancel Reservation' },
  { value: 'request_book', label: 'Request Book' },
  { value: 'approve_book_request', label: 'Approve Book Request' },
  { value: 'reject_book_request', label: 'Reject Book Request' },
  { value: 'export_report', label: 'Export Report' },
  { value: 'change_password', label: 'Change Password' },
  { value: 'update_profile', label: 'Update Profile' },
]

const resources = [
  { value: '', label: 'All Resources' },
  { value: 'user', label: 'User' },
  { value: 'book', label: 'Book' },
  { value: 'category', label: 'Category' },
  { value: 'department', label: 'Department' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'book_request', label: 'Book Request' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'report', label: 'Report' },
  { value: 'settings', label: 'Settings' },
  { value: 'profile', label: 'Profile' },
  { value: 'auth', label: 'Auth' },
]

// Computed
const hasFilters = computed(() =>
  filters.value.search ||
  filters.value.action ||
  filters.value.resource ||
  filters.value.userId ||
  filters.value.startDate ||
  filters.value.endDate
)

const visiblePages = computed(() => {
  const pages: number[] = []
  const total = pagination.value.totalPages
  const current = pagination.value.page
  const maxVisible = 5

  let start = Math.max(1, current - Math.floor(maxVisible / 2))
  let end = Math.min(total, start + maxVisible - 1)

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

const formattedDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const getActionBadgeClass = (action: string) => {
  const classes: Record<string, string> = {
    login: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    logout: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    create: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    update: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    approve: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    reject: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    borrow: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    return: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    extend: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    reserve: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    cancel_reservation: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    request_book: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    approve_book_request: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    reject_book_request: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    export_report: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    change_password: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    update_profile: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  }
  return classes[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const getActionIcon = (action: string) => {
  const icons: Record<string, any> = {
    login: ArrowPathIcon,
    logout: ArrowPathIcon,
    create: DocumentTextIcon,
    update: DocumentTextIcon,
    delete: DocumentTextIcon,
    approve: CheckCircleIcon,
    reject: XCircleIcon,
    borrow: ArrowDownTrayIcon,
    return: ArrowDownTrayIcon,
    extend: ClockIcon,
    reserve: InformationCircleIcon,
    cancel_reservation: XCircleIcon,
    request_book: DocumentTextIcon,
    approve_book_request: CheckCircleIcon,
    reject_book_request: XCircleIcon,
    export_report: ArrowDownTrayIcon,
    change_password: UserCircleIcon,
    update_profile: UserCircleIcon,
  }
  return icons[action] || InformationCircleIcon
}

// Methods
const fetchLogs = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.append('page', String(pagination.value.page))
    params.append('limit', String(pagination.value.limit))
    if (filters.value.search) params.append('search', filters.value.search)
    if (filters.value.action) params.append('action', filters.value.action)
    if (filters.value.resource) params.append('resource', filters.value.resource)
    if (filters.value.userId) params.append('userId', filters.value.userId)
    if (filters.value.startDate) params.append('startDate', filters.value.startDate)
    if (filters.value.endDate) params.append('endDate', filters.value.endDate)
    params.append('sortBy', filters.value.sortBy)
    params.append('sortOrder', filters.value.sortOrder)

    const response = await api.get(`/activity-logs?${params.toString()}`)
    logs.value = response.data.items
    pagination.value.total = response.data.total
    pagination.value.totalPages = response.data.totalPages
  } catch (error) {
    console.error('Failed to fetch activity logs:', error)
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const response = await api.get('/activity-logs/stats')
    stats.value = response.data
  } catch (error) {
    console.error('Failed to fetch activity log stats:', error)
  }
}

const handleSearch = () => {
  pagination.value.page = 1
  fetchLogs()
}

const clearFilters = () => {
  filters.value = {
    search: '',
    action: '',
    resource: '',
    userId: '',
    startDate: '',
    endDate: '',
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  }
  pagination.value.page = 1
  fetchLogs()
}

const changePage = (page: number) => {
  if (page >= 1 && page <= pagination.value.totalPages) {
    pagination.value.page = page
    fetchLogs()
  }
}

const handleSort = (column: string) => {
  if (filters.value.sortBy === column) {
    filters.value.sortOrder = filters.value.sortOrder === 'ASC' ? 'DESC' : 'ASC'
  } else {
    filters.value.sortBy = column
    filters.value.sortOrder = 'DESC'
  }
  fetchLogs()
}

const exportLogs = async () => {
  try {
    const params = new URLSearchParams()
    params.append('format', exportFormat.value)
    if (filters.value.search) params.append('search', filters.value.search)
    if (filters.value.action) params.append('action', filters.value.action)
    if (filters.value.resource) params.append('resource', filters.value.resource)
    if (filters.value.userId) params.append('userId', filters.value.userId)
    if (filters.value.startDate) params.append('startDate', filters.value.startDate)
    if (filters.value.endDate) params.append('endDate', filters.value.endDate)
    params.append('sortBy', filters.value.sortBy)
    params.append('sortOrder', filters.value.sortOrder)

    const response = await api.get(`/activity-logs/export?${params.toString()}`, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data], { type: exportFormat.value === 'csv' ? 'text/csv' : 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.${exportFormat.value}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    showExportModal.value = false
  } catch (error) {
    console.error('Failed to export logs:', error)
  }
}

// Watch for route query changes to restore filters
watch(
  () => route.query,
  (newQuery) => {
    if (Object.keys(newQuery).length > 0) {
      filters.value.search = newQuery.search as string || ''
      filters.value.action = newQuery.action as string || ''
      filters.value.resource = newQuery.resource as string || ''
      filters.value.userId = newQuery.userId as string || ''
      filters.value.startDate = newQuery.startDate as string || ''
      filters.value.endDate = newQuery.endDate as string || ''
      filters.value.sortBy = newQuery.sortBy as string || 'createdAt'
      filters.value.sortOrder = (newQuery.sortOrder as 'ASC' | 'DESC') || 'DESC'
      pagination.value.page = parseInt(newQuery.page as string) || 1
      pagination.value.limit = parseInt(newQuery.limit as string) || 20
      fetchLogs()
    }
  },
  { immediate: true, deep: true }
)

// Update URL query params when filters change
watch(
  [() => filters.value, () => pagination.value.page],
  () => {
    const params: Record<string, string> = {}
    if (filters.value.search) params.search = filters.value.search
    if (filters.value.action) params.action = filters.value.action
    if (filters.value.resource) params.resource = filters.value.resource
    if (filters.value.userId) params.userId = filters.value.userId
    if (filters.value.startDate) params.startDate = filters.value.startDate
    if (filters.value.endDate) params.endDate = filters.value.endDate
    if (filters.value.sortBy !== 'createdAt') params.sortBy = filters.value.sortBy
    if (filters.value.sortOrder !== 'DESC') params.sortOrder = filters.value.sortOrder
    if (pagination.value.page > 1) params.page = String(pagination.value.page)

    router.replace({ query: params })
  },
  { deep: true }
)

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Activity Log</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Monitor all system activities and user actions
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="showExportModal = true"
          class="btn-secondary flex items-center gap-2"
        >
          <ArrowDownTrayIcon class="w-5 h-5" />
          Export
        </button>
        <button
          @click="fetchLogs"
          :disabled="loading"
          class="btn-secondary flex items-center gap-2"
        >
          <ArrowPathIcon class="w-5 h-5" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <DocumentTextIcon class="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Total Logs</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.totalLogs.toLocaleString() }}</p>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <ClockIcon class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Today</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.todayLogs.toLocaleString() }}</p>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <ClockIcon class="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">This Week</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.thisWeekLogs.toLocaleString() }}</p>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <FunnelIcon class="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Filtered</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ logs.length }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Panel -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
      <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
        <button
          @click="showFilters = !showFilters"
          class="btn-ghost text-sm flex items-center gap-1"
        >
          <FunnelIcon class="w-4 h-4" />
          {{ showFilters ? 'Hide' : 'Show' }} Filters
        </button>
      </div>

      <transition name="slide">
        <div v-show="showFilters" class="px-5 py-4 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <!-- Search -->
            <div class="lg:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
              <div class="relative">
                <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  v-model="filters.search"
                  @keyup.enter="handleSearch"
                  placeholder="Search description..."
                  class="input-field pl-10"
                />
              </div>
            </div>

            <!-- Action Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
              <select v-model="filters.action" class="input-field" @change="handleSearch">
                <option v-for="a in actions" :key="a.value" :value="a.value">{{ a.label }}</option>
              </select>
            </div>

            <!-- Resource Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resource</label>
              <select v-model="filters.resource" class="input-field" @change="handleSearch">
                <option v-for="r in resources" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>

            <!-- Date Range -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
              <input
                v-model="filters.startDate"
                type="date"
                class="input-field"
                @change="handleSearch"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
              <input
                v-model="filters.endDate"
                type="date"
                class="input-field"
                @change="handleSearch"
              />
            </div>

            <!-- User ID (optional) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User ID</label>
              <input
                v-model="filters.userId"
                type="number"
                placeholder="User ID"
                class="input-field"
                @keyup.enter="handleSearch"
              />
            </div>
          </div>

          <!-- Clear Filters Button -->
          <div v-if="hasFilters" class="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-700">
            <button @click="clearFilters" class="btn-ghost text-sm text-red-600 hover:text-red-700">
              Clear All Filters
            </button>
          </div>
        </div>
      </transition>
    </div>

    <!-- Logs Table -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-slate-800/50">
            <tr>
              <th @click="handleSort('createdAt')" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-slate-700/50">
                <div class="flex items-center gap-1">
                  Date & Time
                  <span v-if="filters.sortBy === 'createdAt'" :class="filters.sortOrder === 'ASC' ? 'rotate-180' : ''" class="transition-transform">
                    <ChevronLeftIcon class="w-4 h-4" />
                  </span>
                </div>
              </th>
              <th @click="handleSort('action')" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-slate-700/50">
                Action
              </th>
              <th @click="handleSort('resource')" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-slate-700/50">
                Resource
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
              <th @click="handleSort('userId')" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-slate-700/50">
                User
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
            <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ formattedDate(log.createdAt) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', getActionBadgeClass(log.action)]"
                >
                  <component :is="getActionIcon(log.action)" class="w-3 h-3" />
                  {{ log.action.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()) }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                  {{ log.resource.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()) }}
                  <span v-if="log.resourceId" class="ml-1 text-gray-500 dark:text-gray-400">#{{ log.resourceId }}</span>
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-md truncate" :title="log.description">
                {{ log.description || '-' }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div v-if="log.user" class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <UserCircleIcon class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <span class="text-sm text-gray-900 dark:text-white font-medium">
                    {{ log.user.firstName }} {{ log.user.lastName }}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">#{{ log.userId }}</span>
                </div>
                <span v-else class="text-sm text-gray-500 dark:text-gray-400">System</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                {{ log.ipAddress || '-' }}
              </td>
            </tr>
            <tr v-if="logs.length === 0 && !loading">
              <td colspan="6" class="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                <DocumentTextIcon class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p class="text-lg font-medium">No activity logs found</p>
                <p class="text-sm mt-1">Try adjusting your filters or search terms</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex items-center justify-center z-10">
        <ArrowPathIcon class="w-8 h-8 text-primary-600 animate-spin" />
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          Showing {{ (pagination.page - 1) * pagination.limit + 1 }} to {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of {{ pagination.total }} results
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="changePage(pagination.page - 1)"
            :disabled="pagination.page === 1 || loading"
            class="btn-ghost p-2"
            :aria-label="`Page ${pagination.page - 1}`"
          >
            <ChevronLeftIcon class="w-5 h-5" />
          </button>
          <div class="flex items-center gap-1">
            <button
              v-for="p in visiblePages"
              :key="p"
              @click="changePage(p)"
              :class="[
                'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                p === pagination.page
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              ]"
            >
              {{ p }}
            </button>
          </div>
          <button
            @click="changePage(pagination.page + 1)"
            :disabled="pagination.page === pagination.totalPages || loading"
            class="btn-ghost p-2"
            :aria-label="`Page ${pagination.page + 1}`"
          >
            <ChevronRightIcon class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Export Modal -->
    <Transition name="fade">
      <div v-if="showExportModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 animate-slide-up">
          <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Export Activity Logs</h3>
            <button @click="showExportModal = false" class="btn-ghost p-1">
              <XCircleIconExport class="w-5 h-5" />
            </button>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format</label>
              <div class="grid grid-cols-2 gap-3">
                <label class="relative cursor-pointer">
                  <input type="radio" value="csv" v-model="exportFormat" class="sr-only peer" />
                  <div class="p-4 border-2 rounded-lg text-center transition-all peer-checked:border-primary-500 peer-checked:bg-primary-50 dark:peer-checked:bg-primary-900/20">
                    <ArrowDownTrayIcon class="w-8 h-8 mx-auto mb-2 text-gray-400 peer-checked:text-primary-600" />
                    <p class="font-medium text-gray-900 dark:text-white">CSV</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Spreadsheet compatible</p>
                  </div>
                </label>
                <label class="relative cursor-pointer">
                  <input type="radio" value="json" v-model="exportFormat" class="sr-only peer" />
                  <div class="p-4 border-2 rounded-lg text-center transition-all peer-checked:border-primary-500 peer-checked:bg-primary-50 dark:peer-checked:bg-primary-900/20">
                    <DocumentTextIcon class="w-8 h-8 mx-auto mb-2 text-gray-400 peer-checked:text-primary-600" />
                    <p class="font-medium text-gray-900 dark:text-white">JSON</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Machine readable</p>
                  </div>
                </label>
              </div>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
              <button @click="showExportModal = false" class="btn-secondary">Cancel</button>
              <button @click="exportLogs" class="btn-primary flex items-center gap-2">
                <ArrowDownTrayIcon class="w-5 h-5" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Animation for filter panel */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Modal animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.animate-slide-up {
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Table responsiveness */
@media (max-width: 768px) {
  table {
    min-width: 800px;
  }
}
</style>