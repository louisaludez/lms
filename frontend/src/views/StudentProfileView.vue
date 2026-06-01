<script setup lang="ts">
import { onMounted, computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { format, parseISO, isPast, differenceInDays } from 'date-fns'
import { useLibraryStore, useAuthStore } from '@/stores/useLibraryStore'
import NavBar from '@/components/NavBar.vue'
import {
  UserCircleIcon, BookOpenIcon, ExclamationTriangleIcon,
  ClockIcon, CheckCircleIcon, ArrowPathIcon, ArrowLeftIcon,
} from '@heroicons/vue/24/outline'
import { ArrowDownTrayIcon, QrCodeIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline'
import { ExclamationCircleIcon } from '@heroicons/vue/24/solid'
import JsBarcode from 'jsbarcode'
import { toPng } from 'html-to-image'
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
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <NavBar />

    <!-- Profile Header -->
    <div class="bg-gradient-to-r from-[#123249] to-[#447794] py-8 sm:py-12 px-4 sm:px-6">
      <div class="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-6">
        <div class="w-24 h-24 md:w-20 md:h-20 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 ring-2 ring-white/30">
          <UserCircleIcon v-if="!user?.profilePhotoUrl" class="w-12 h-12 text-white/80" />
          <img v-else :src="user.profilePhotoUrl" class="w-full h-full object-cover rounded-2xl" :alt="user?.firstName" />
        </div>
        <div class="text-white flex-1 min-w-0 text-center md:text-left flex flex-col items-center md:items-start">
          <h1 class="text-2xl font-bold">{{ user?.firstName }} {{ user?.lastName }}</h1>
          <p class="text-[#aed0e2] text-sm mt-0.5">
            {{ user?.institutionalId }}
            <span v-if="user?.department" class="hidden md:inline"> • {{ user.department.name }}</span>
            <span v-if="user?.department" class="block md:hidden text-xs mt-1">{{ user.department.name }}</span>
            <span v-if="user?.gender"> • {{ user.gender }}</span>
          </p>
          <button @click="isSettingsModalOpen = true" class="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-white/80 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors border border-white/20">
            <Cog6ToothIcon class="w-4 h-4" />
            Edit Profile
          </button>
          <div class="flex items-center gap-3 mt-3 flex-wrap justify-center md:justify-start">
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
          <!-- Visible UI -->
          <div class="bg-white/10 backdrop-blur-sm p-5 sm:p-6 rounded-2xl flex flex-col items-center gap-3 border border-white/20 shadow-xl text-center w-full max-w-[280px] md:min-w-[200px]">
            <QrCodeIcon class="w-12 h-12 text-white/90" />
            <div>
              <p class="text-white font-bold text-lg">Digital ID</p>
              <p class="text-[#aed0e2] text-sm mt-0.5">Ready for download</p>
            </div>
            <button 
              @click="downloadId" 
              :disabled="isDownloadingId"
              class="mt-2 flex items-center gap-2 text-sm font-bold text-[#123249] bg-white hover:bg-slate-50 px-6 py-3 rounded-xl transition-all shadow-lg w-full justify-center cursor-pointer disabled:opacity-75 disabled:cursor-wait"
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
              style="width: 280px; aspect-ratio: 591 / 1004;"
            >
              <!-- Background Template -->
              <img src="@/assets/id.png" class="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" alt="ID Template" crossorigin="anonymous" />
              
              <!-- Automated ID Header -->
              <div 
                class="absolute z-10 w-full text-center px-4 flex flex-col justify-center"
                style="top: 25%; height: 5%;"
              >
                <h3 class="text-[12px] font-black text-rose-600 uppercase tracking-widest drop-shadow-sm">
                  AUTOMATED ID
                </h3>
              </div>

              <!-- User Photo -->
              <div 
                class="absolute z-10 overflow-hidden"
                style="left: 36%; right: 36%; top: 31%; bottom: 49%; border-radius: 8px;"
              >
                <img v-if="user.profilePhotoUrl" :src="user.profilePhotoUrl" class="w-full h-full object-cover" crossorigin="anonymous" />
                <div v-else class="w-full h-full bg-slate-200 flex items-center justify-center">
                  <UserCircleIcon class="w-12 h-12 text-slate-400" />
                </div>
              </div>

              <!-- Name -->
              <div 
                class="absolute z-10 w-full text-center px-4 flex flex-col justify-center"
                style="top: 52%; height: 5%;"
              >
                <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide truncate">
                  {{ user.firstName }} {{ user.lastName }}
                </h2>
              </div>

              <!-- Role -->
              <div 
                class="absolute z-10 w-full text-center px-4 flex flex-col justify-center"
                style="top: 57%; height: 3%;"
              >
                <p class="text-[10px] font-bold text-[#8c1c1c] uppercase tracking-widest truncate">
                  {{ user.role || 'STUDENT' }}
                </p>
              </div>

              <!-- Barcode Canvas -->
              <div 
                class="absolute z-10 w-full flex justify-center items-center"
                style="top: 61%; height: 10%;"
              >
                <canvas ref="barcodeCanvas" class="w-[140px] h-[40px]"></canvas>
              </div>

              <!-- Institutional ID -->
              <div 
                class="absolute z-10 w-full text-center flex flex-col justify-center"
                style="top: 71%; height: 4%;"
              >
                <p class="text-[11px] font-semibold text-slate-800 uppercase tracking-wider">
                  {{ user.barcode }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      <!-- Suspension Alert -->
      <div
        v-if="auth.isSuspended || store.hasOverdue"
        class="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex gap-4"
      >
        <ExclamationCircleIcon class="w-7 h-7 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p class="font-semibold text-amber-800">Your account is suspended</p>
          <p class="text-amber-700 text-sm mt-1">
            You have <strong>{{ store.overdueCount }}</strong> overdue item(s) with a total fine of
            <strong>₱{{ store.totalFinesDue.toFixed(2) }}</strong>.
            Please return the overdue books and settle your fines at the library counter to restore your borrowing privileges.
          </p>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="card p-5 text-center">
          <p class="text-3xl font-bold text-[#447794]">{{ store.myActiveTransactions.length }}</p>
          <p class="text-xs text-slate-500 mt-1 font-medium">Currently Borrowed</p>
        </div>
        <div class="card p-5 text-center">
          <p class="text-3xl font-bold text-rose-500">{{ store.overdueCount }}</p>
          <p class="text-xs text-slate-500 mt-1 font-medium">Overdue</p>
        </div>
        <div class="card p-5 text-center">
          <p class="text-3xl font-bold text-slate-600">{{ store.myTransactions.length }}</p>
          <p class="text-xs text-slate-500 mt-1 font-medium">Total History</p>
        </div>
      </div>

      <!-- Currently Borrowed -->
      <div class="card">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <BookOpenIcon class="w-5 h-5 text-[#447794]" />
          <h2 class="font-semibold text-slate-800">Currently Borrowed</h2>
        </div>

        <div v-if="store.loadingTransactions" class="p-6 space-y-3">
          <div v-for="i in 2" :key="i" class="skeleton h-20 rounded-xl" />
        </div>

        <div v-else-if="store.myActiveTransactions.length === 0" class="py-12 text-center text-slate-400">
          <CheckCircleIcon class="w-12 h-12 mx-auto mb-3 text-emerald-300" />
          <p class="font-medium">No active borrows</p>
          <p class="text-sm mt-1">
            <router-link to="/opac" class="text-[#447794] hover:underline">Browse the catalog</router-link>
            to find a book to borrow.
          </p>
        </div>

        <div v-else class="divide-y divide-slate-50">
          <div
            v-for="tx in store.myActiveTransactions"
            :key="tx.id"
            class="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors"
          >
            <div class="flex items-start gap-4 flex-1 min-w-0 w-full sm:w-auto">
              <!-- Book cover placeholder -->
              <div class="w-12 h-16 rounded-lg bg-gradient-to-b from-[#2D5B75] to-[#123249] flex-shrink-0 flex items-center justify-center mt-0.5 sm:mt-0">
                <BookOpenIcon class="w-6 h-6 text-white/60" />
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-semibold text-slate-800 text-sm truncate">{{ tx.bookCopy.book.title }}</p>
                <p class="text-xs text-slate-500 mt-0.5 truncate">{{ tx.bookCopy.book.authors?.join(', ') ?? 'Unknown Author' }}</p>
                <div class="flex items-center gap-3 mt-2 flex-wrap">
                  <span :class="statusClass(tx.status)">{{ tx.status }}</span>

                  <!-- Due date indicator -->
                  <span
                    v-if="tx.status === 'active'"
                    :class="[
                      'text-xs font-medium flex items-center gap-1',
                      daysUntilDue(tx.dueDate) <= 3 ? 'text-amber-600' : 'text-slate-500'
                    ]"
                  >
                    <ClockIcon class="w-3.5 h-3.5" />
                    Due {{ formatDate(tx.dueDate) }}
                    <span v-if="daysUntilDue(tx.dueDate) <= 3 && daysUntilDue(tx.dueDate) >= 0">
                      ({{ daysUntilDue(tx.dueDate) }}d left)
                    </span>
                  </span>

                  <!-- Overdue indicator -->
                  <span v-if="tx.status === 'overdue'" class="text-xs font-medium text-rose-600 flex items-center gap-1">
                    <ExclamationTriangleIcon class="w-3.5 h-3.5 flex-shrink-0" />
                    {{ tx.overdueDays }} day(s) overdue — Fine: ₱{{ Number(tx.fineAmount).toFixed(2) }}
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

      <!-- Borrowing History -->
      <div class="card">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <ClockIcon class="w-5 h-5 text-[#447794]" />
          <h2 class="font-semibold text-slate-800">Borrowing History</h2>
        </div>

        <div v-if="store.myTransactions.length === 0" class="py-10 text-center text-slate-400 text-sm">
          No borrowing history yet.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[600px]">
            <thead class="bg-slate-50 border-b border-slate-100">
              <tr>
                <th class="table-header px-4 py-3 text-left">Book</th>
                <th class="table-header px-4 py-3 text-left">Checkout</th>
                <th class="table-header px-4 py-3 text-left">Due</th>
                <th class="table-header px-4 py-3 text-left">Returned</th>
                <th class="table-header px-4 py-3 text-left">Fine</th>
                <th class="table-header px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="tx in store.myTransactions.filter(t => t.status === 'returned')"
                :key="tx.id"
                class="table-row"
              >
                <td class="table-cell px-4 font-medium max-w-[200px]">
                  <p class="truncate">{{ tx.bookCopy.book.title }}</p>
                </td>
                <td class="table-cell px-4">{{ formatDate(tx.checkoutDate) }}</td>
                <td class="table-cell px-4">{{ formatDate(tx.dueDate) }}</td>
                <td class="table-cell px-4">{{ tx.returnDate ? formatDate(tx.returnDate) : '—' }}</td>
                <td class="table-cell px-4">
                  <span v-if="Number(tx.fineAmount) > 0" class="text-rose-600 font-medium">
                    ₱{{ Number(tx.fineAmount).toFixed(2) }}
                  </span>
                  <span v-else class="text-emerald-500">—</span>
                </td>
                <td class="table-cell px-4">
                  <span :class="statusClass(tx.status)">{{ tx.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <ProfileSettingsModal :isOpen="isSettingsModalOpen" @close="isSettingsModalOpen = false" />
  </div>
</template>
