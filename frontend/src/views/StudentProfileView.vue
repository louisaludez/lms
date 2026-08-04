<script setup lang="ts">
import { onMounted, computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { format, parseISO, isPast, differenceInDays } from 'date-fns'
import { useLibraryStore, useAuthStore } from '@/stores/useLibraryStore'
import NavBar from '@/components/NavBar.vue'
import {
  UserCircleIcon, BookOpenIcon, ExclamationTriangleIcon,
  ClockIcon, CheckCircleIcon, ArrowPathIcon, ArrowLeftIcon,
  ChartPieIcon, ChartBarIcon
} from '@heroicons/vue/24/outline'
import { ArrowDownTrayIcon, QrCodeIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline'
import { ExclamationCircleIcon } from '@heroicons/vue/24/solid'
import JsBarcode from 'jsbarcode'
import { toPng } from 'html-to-image'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)
import ProfileSettingsModal from '@/components/ProfileSettingsModal.vue'

const router = useRouter()
const auth = useAuthStore()
const store = useLibraryStore()

const barcodeCanvas = ref<HTMLCanvasElement | null>(null)
const idCardRef = ref<HTMLElement | null>(null)
const isSettingsModalOpen = ref(false)
const isDownloadingId = ref(false)

onMounted(() => {
  store.fetchMyTransactions()
})

const user = computed(() => auth.user)

watchEffect(() => {
  if (user.value?.barcode && barcodeCanvas.value) {
    JsBarcode(barcodeCanvas.value, (user.value as any).barcode, {
      format: "CODE128",
      lineColor: "#0f172a",
      width: 2,
      height: 40,
      displayValue: false,
      margin: 0,
      background: "transparent",
    })
  }
})

async function downloadId() {
  if (!idCardRef.value || isDownloadingId.value) return
  
  isDownloadingId.value = true
  try {
    const dataUrl = await toPng(idCardRef.value, {
      pixelRatio: 3, // High resolution download
      cacheBust: true,
    })
    const link = document.createElement('a')
    link.download = `lumina-id-${(user.value as any)?.barcode}.png`
    link.href = dataUrl
    link.click()
  } catch (err: any) {
    console.error("Failed to generate ID:", err)
    alert("Failed to download ID. Error: " + (err.message || err))
  } finally {
    isDownloadingId.value = false
  }
}

function formatDate(dateStr: string) {
  try { return format(parseISO(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}

function daysUntilDue(dueDate: string) {
  const due = parseISO(dueDate)
  const diff = differenceInDays(due, new Date())
  return diff
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    active: 'badge-active',
    overdue: 'badge-overdue',
    returned: 'badge-returned',
    lost: 'badge-overdue',
  }
  return map[status] ?? 'badge-returned'
}

async function handleRenew(txId: number) {
  try {
    await store.renewBook(txId)
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Renewal failed')
  }
}

// Chart Configurations
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

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1 }
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      padding: 12,
      cornerRadius: 8,
    }
  }
}

const borrowingStatusData = computed(() => {
  const returned = store.myTransactions.filter(t => t.status === 'returned').length
  const active = store.myTransactions.filter(t => t.status === 'active').length
  const overdue = store.myTransactions.filter(t => t.status === 'overdue').length
  
  return {
    labels: ['Returned', 'Currently Borrowed', 'Overdue'],
    datasets: [{
      data: [returned, active, overdue],
      backgroundColor: ['#10b981', '#0ea5e9', '#f43f5e'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  }
})

// Borrowing History Filters
const historyFilter = ref<'all' | 'returned' | 'currently_borrowed'>('all')

const historyCounts = computed(() => {
  const all = store.myTransactions.length
  const returned = store.myTransactions.filter(t => t.status === 'returned').length
  const currentlyBorrowed = store.myTransactions.filter(t => t.status === 'active' || t.status === 'overdue').length
  return { all, returned, currentlyBorrowed }
})

const filteredHistory = computed(() => {
  if (historyFilter.value === 'returned') {
    return store.myTransactions.filter(t => t.status === 'returned')
  }
  if (historyFilter.value === 'currently_borrowed') {
    return store.myTransactions.filter(t => t.status === 'active' || t.status === 'overdue')
  }
  return store.myTransactions
})

function formatStatus(status: string) {
  const map: Record<string, string> = {
    active: 'Active',
    overdue: 'Overdue',
    returned: 'Returned',
    lost: 'Lost',
  }
  return map[status] ?? status
}

const monthlyActivityData = computed(() => {
  const months = []
  const data = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push(format(d, 'MMM'))
    
    const count = store.myTransactions.filter(t => {
      const txDate = new Date(t.checkoutDate)
      return txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear()
    }).length
    data.push(count)
  }

  return {
    labels: months,
    datasets: [{
      label: 'Books Borrowed',
      data: data,
      backgroundColor: '#447794',
      borderRadius: 6,
    }]
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#F7F5F0] dark:bg-[#0F172A] transition-colors duration-200">
    <NavBar />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      <!-- Profile Header Card -->
      <div class="card p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <!-- Optional Accent Line at Top -->
        <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#6B131D] to-[#447794]"></div>
        
        <div class="w-24 h-24 md:w-20 md:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700">
          <UserCircleIcon v-if="!user?.profilePhotoUrl" class="w-12 h-12 text-slate-400" />
          <img v-else :src="user.profilePhotoUrl" class="w-full h-full object-cover rounded-2xl" :alt="user?.firstName" />
        </div>
        
        <div class="flex-1 min-w-0 text-center md:text-left flex flex-col items-center md:items-start">
          <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ user?.firstName }} {{ user?.lastName }}</h1>
          <p class="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {{ user?.institutionalId }}
            <span v-if="user?.department" class="hidden md:inline"> • {{ user.department.name }}</span>
            <span v-if="user?.department" class="block md:hidden text-xs mt-1">{{ user.department.name }}</span>
            <span v-if="user?.gender"> • {{ user.gender }}</span>
          </p>
          <button @click="isSettingsModalOpen = true" class="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer">
            <Cog6ToothIcon class="w-4 h-4" />
            Edit Profile
          </button>
          <div class="flex items-center gap-3 mt-4 flex-wrap justify-center md:justify-start">
            <span v-if="user?.eligibilityStatus === 'eligible' && !store.hasOverdue" class="badge-eligible">
              ✅ Eligible to Borrow
            </span>
            <span v-else-if="user?.eligibilityStatus === 'suspended' || store.hasOverdue" class="badge-suspended">
              ⚠️ Account Suspended
            </span>
            <span v-else class="badge-overdue">🚫 Not Eligible</span>
          </div>
        </div>

        <!-- Download ID Section -->
        <div v-if="user?.barcode" class="flex flex-col items-center gap-4 md:ml-auto mt-4 md:mt-0 w-full md:w-auto">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl flex flex-col items-center gap-3 border border-slate-200 dark:border-slate-700 shadow-sm text-center w-full max-w-[280px] md:min-w-[200px]">
            <QrCodeIcon class="w-12 h-12 text-[#6B131D] dark:text-rose-400" />
            <div>
              <p class="text-slate-800 dark:text-slate-100 font-bold text-lg">Digital ID</p>
              <p class="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Ready for download</p>
            </div>
            <button 
              @click="downloadId" 
              :disabled="isDownloadingId"
              class="mt-2 flex items-center gap-2 text-sm font-bold text-white bg-[#6B131D] hover:bg-[#8B1A28] dark:bg-rose-600 dark:hover:bg-rose-500 px-6 py-2.5 rounded-xl transition-all shadow-sm w-full justify-center cursor-pointer disabled:opacity-75 disabled:cursor-wait"
            >
              <ArrowPathIcon v-if="isDownloadingId" class="w-5 h-5 animate-spin" />
              <ArrowDownTrayIcon v-else class="w-5 h-5" />
              {{ isDownloadingId ? 'Downloading...' : 'Download ID' }}
            </button>
          </div>

          <!-- Hidden ID Card for Canvas Generation -->
          <div style="position: absolute; z-index: -100; opacity: 0; pointer-events: none; top: 0; left: 0;">
            <div 
              ref="idCardRef"
              class="relative overflow-hidden rounded-xl shadow-2xl bg-white select-none"
              style="width: 346px; height: 599px;"
            >
              <img src="@/assets/id.png" class="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" alt="ID Template" crossorigin="anonymous" />

              <!-- "AUTOMATED ID" Title -->
              <div 
                class="absolute z-10 w-full text-center flex justify-center"
                style="top: 100px;"
              >
                <h3 class="text-[14px] font-black text-[#1a233a] uppercase tracking-widest drop-shadow-sm">
                  AUTOMATED ID
                </h3>
              </div>

              <!-- Photo with Red Border -->
              <div 
                class="absolute z-10 overflow-hidden border-[3px] border-[#b91c1c] flex items-center justify-center bg-white"
                style="width: 140px; height: 160px; left: 50%; top: 145px; transform: translateX(-50%); border-radius: 12px;"
              >
                <img v-if="user.profilePhotoUrl" :src="user.profilePhotoUrl" class="w-full h-full object-cover" crossorigin="anonymous" />
                <UserCircleIcon v-else class="w-16 h-16 text-slate-400 bg-white" />
              </div>

              <!-- Name -->
              <div 
                class="absolute z-10 w-full text-center flex justify-center"
                style="top: 310px;"
              >
                <h2 class="text-[17px] font-black text-[#2e3440] uppercase tracking-wide truncate drop-shadow-sm" style="min-width: 180px;">
                  {{ user.firstName }} {{ user.lastName }}
                </h2>
              </div>

              <!-- Role -->
              <div 
                class="absolute z-10 w-full text-center flex justify-center"
                style="top: 345px;"
              >
                <p class="text-[13px] font-bold text-[#b91c1c] uppercase tracking-[0.1em]" style="min-width: 120px;">
                  {{ user.role || 'STUDENT' }}
                </p>
              </div>

              <!-- Barcode -->
              <div 
                class="absolute z-10 flex justify-center items-center rounded-md px-2 py-1"
                style="width: 220px; height: 95px; left: 50%; top: 370px; transform: translateX(-50%);"
              >
                <canvas ref="barcodeCanvas" class="w-[200px] h-[85px]"></canvas>
              </div>

              <!-- ID Number -->
              <div 
                class="absolute z-10 w-full text-center flex justify-center"
                style="top: 475px;"
              >
                <p class="text-[14px] font-bold text-[#3b4252] tracking-wider" style="min-width: 160px;">
                  {{ user.barcode }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Suspension Alert -->
      <div
        v-if="auth.isSuspended || store.hasOverdue"
        class="rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 p-5 flex gap-4"
      >
        <ExclamationCircleIcon class="w-7 h-7 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <h2 class="font-semibold text-amber-900 dark:text-amber-300">Account Alert</h2>
          <p v-if="store.hasOverdue" class="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
            You have {{ store.myTransactions.filter(t => t.status === 'overdue').length }} overdue book(s). Please return them immediately.
          </p>
          <p v-else class="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
            Your account is suspended. Please visit the library counter for assistance.
          </p>
        </div>
      </div>

      <!-- Borrowing Analytics Charts -->
      <div v-if="store.myTransactions.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="card p-5">
          <div class="flex items-center gap-2 mb-4">
            <ChartPieIcon class="w-5 h-5 text-[#6B131D] dark:text-rose-400" />
            <h2 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Borrowing Status Breakdown</h2>
          </div>
          <div class="h-56 relative">
            <Doughnut :data="borrowingStatusData" :options="chartOptions" />
          </div>
        </div>

        <div class="card p-5">
          <div class="flex items-center gap-2 mb-4">
            <ChartBarIcon class="w-5 h-5 text-[#6B131D] dark:text-rose-400" />
            <h2 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Monthly Borrowing Activity</h2>
          </div>
          <div class="h-56 relative">
            <Bar :data="monthlyActivityData" :options="barChartOptions" />
          </div>
        </div>
      </div>

      <!-- Books Sections Side-by-Side -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Currently Borrowed Books Section -->
        <div class="card flex flex-col">
        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <BookOpenIcon class="w-5 h-5 text-[#6B131D] dark:text-rose-400" />
            <h2 class="font-bold text-slate-800 dark:text-slate-100">Currently Borrowed</h2>
          </div>
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {{ store.myActiveTransactions.length }} / 3 Books
          </span>
        </div>

        <div v-if="store.myActiveTransactions.length === 0" class="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
          No books currently borrowed. <router-link to="/opac" class="text-[#6B131D] dark:text-rose-400 font-semibold hover:underline">Browse Catalog</router-link>
        </div>

        <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
          <div
            v-for="tx in store.myActiveTransactions"
            :key="tx.id"
            class="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
          >
            <div class="flex items-start gap-4 min-w-0">
              <div class="w-10 h-14 bg-[#ECEBE8] dark:bg-[#283548] rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                <BookOpenIcon class="w-5 h-5 text-slate-400" />
              </div>
              <div class="min-w-0">
                <p class="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{{ tx.bookCopy?.book?.title ?? 'Book' }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Barcode: <span class="font-mono text-slate-700 dark:text-slate-300">{{ tx.bookCopy?.barcode }}</span>
                </p>
                <div class="flex items-center gap-3 mt-2 flex-wrap">
                  <span class="text-xs text-slate-500 dark:text-slate-400">Checked out: {{ formatDate(tx.checkoutDate) }}</span>
                  <span :class="['text-xs font-semibold flex items-center gap-1', tx.status === 'overdue' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300']">
                    <ClockIcon class="w-3.5 h-3.5" />
                    Due {{ formatDate(tx.dueDate) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Renew Button -->
            <button
              v-if="tx.status === 'active' && tx.renewalCount < 2"
              @click="handleRenew(tx.id)"
              class="btn-ghost text-xs flex-shrink-0 w-full sm:w-auto justify-center mt-2 sm:mt-0"
            >
              <ArrowPathIcon class="w-4 h-4" />
              Renew
            </button>
            <span v-else-if="tx.renewalCount >= 2" class="text-xs text-slate-400 flex-shrink-0 w-full sm:w-auto text-center sm:text-right mt-2 sm:mt-0">Max renewals</span>
          </div>
        </div>
      </div>

        </div>

        <!-- Borrowing History Section -->
        <div class="card flex flex-col">
        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <ClockIcon class="w-5 h-5 text-[#6B131D] dark:text-rose-400" />
            <h2 class="font-bold text-slate-800 dark:text-slate-100">Borrowing History</h2>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {{ historyCounts.all }}
            </span>
          </div>

          <!-- Fix: Filter Tabs High Contrast in Light & Dark Mode -->
          <div class="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1.5 rounded-xl w-full sm:w-auto">
            <button
              @click="historyFilter = 'all'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 sm:flex-none flex items-center justify-center gap-1.5 cursor-pointer',
                historyFilter === 'all'
                  ? 'bg-white dark:bg-[#6B131D] text-slate-800 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              All
              <span :class="['px-1.5 py-0.2 text-[10px] rounded-full font-bold', historyFilter === 'all' ? 'bg-slate-100 dark:bg-white/20 text-slate-700 dark:text-white' : 'bg-slate-300/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300']">
                {{ historyCounts.all }}
              </span>
            </button>

            <button
              @click="historyFilter = 'returned'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 sm:flex-none flex items-center justify-center gap-1.5 cursor-pointer',
                historyFilter === 'returned'
                  ? 'bg-white dark:bg-[#6B131D] text-slate-800 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              Returned
              <span :class="['px-1.5 py-0.2 text-[10px] rounded-full font-bold', historyFilter === 'returned' ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300' : 'bg-slate-300/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300']">
                {{ historyCounts.returned }}
              </span>
            </button>

            <button
              @click="historyFilter = 'currently_borrowed'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 sm:flex-none flex items-center justify-center gap-1.5 cursor-pointer',
                historyFilter === 'currently_borrowed'
                  ? 'bg-white dark:bg-[#6B131D] text-slate-800 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              Currently Borrowed
              <span :class="['px-1.5 py-0.2 text-[10px] rounded-full font-bold', historyFilter === 'currently_borrowed' ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300' : 'bg-slate-300/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300']">
                {{ historyCounts.currentlyBorrowed }}
              </span>
            </button>
          </div>
        </div>

        <div v-if="store.myTransactions.length === 0" class="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
          No borrowing history yet.
        </div>

        <div v-else-if="filteredHistory.length === 0" class="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
          No {{ historyFilter === 'returned' ? 'returned' : 'currently borrowed' }} books found.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[600px]">
            <thead class="bg-slate-50 dark:bg-[#1E293B] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th class="table-header text-left">Book Title</th>
                <th class="table-header text-left">Checkout Date</th>
                <th class="table-header text-left">Return Date</th>
                <th class="table-header text-left">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="tx in filteredHistory" :key="tx.id" class="table-row">
                <td class="table-cell font-semibold text-slate-800 dark:text-slate-100">
                  {{ tx.bookCopy?.book?.title ?? 'Unknown Book' }}
                </td>
                <td class="table-cell text-slate-600 dark:text-slate-400">
                  {{ formatDate(tx.checkoutDate) }}
                </td>
                <td class="table-cell text-slate-600 dark:text-slate-400">
                  {{ tx.returnDate ? formatDate(tx.returnDate) : '—' }}
                </td>
                <td class="table-cell">
                  <span :class="statusClass(tx.status)">
                    {{ formatStatus(tx.status) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Edit Profile Modal -->
    <ProfileSettingsModal
      :isOpen="isSettingsModalOpen"
      @close="isSettingsModalOpen = false"
    />
  </div>
</template>
