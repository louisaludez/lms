<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { format } from 'date-fns'
import api from '@/api/axios'
import { ClipboardDocumentListIcon, UserCircleIcon } from '@heroicons/vue/24/outline'

const logs = ref<any[]>([])
const count = ref({ entries: 0, exits: 0 })
const loading = ref(false)
const scanBarcode = ref('')
const scanType = ref<'entry' | 'exit'>('entry')
const scanPurpose = ref('')
const scanResult = ref<any>(null)
const scanError = ref('')

async function fetchToday() {
  loading.value = true
  try {
    const [logsRes, countRes] = await Promise.all([
      api.get('/attendance/today'),
      api.get('/attendance/today/count'),
    ])
    logs.value = logsRes.data
    count.value = countRes.data
  } finally {
    loading.value = false
  }
}

import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(fetchToday)

function formatTime(dt: string) {
  try { return format(new Date(dt), 'hh:mm a') } catch { return dt }
}
</script>

<template>
  <div class="space-y-6 max-w-5xl">
    <!-- Count pills -->
    <div class="flex gap-4">
      <div class="card px-6 py-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-xl bg-[#447794]/10 flex items-center justify-center">
          <span class="text-[#447794] font-bold text-lg">↓</span>
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-800">{{ count.entries }}</p>
          <p class="text-xs text-slate-500">Entries Today</p>
        </div>
      </div>
      <div class="card px-6 py-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <span class="text-emerald-600 font-bold text-lg">↑</span>
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-800">{{ count.exits }}</p>
          <p class="text-xs text-slate-500">Exits Today</p>
        </div>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <!-- Scan Panel -->
      <div class="card p-6">
        <div class="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
          <ClipboardDocumentListIcon class="w-5 h-5 text-[#447794]" />
          <h2 class="font-semibold text-slate-800">Scan ID Card</h2>
        </div>

        <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div class="w-16 h-16 rounded-2xl bg-[#447794]/10 text-[#447794] flex items-center justify-center mb-4">
            <ClipboardDocumentListIcon class="w-8 h-8" />
          </div>
          <h3 class="text-lg font-bold text-slate-800">Ready to Scan?</h3>
          <p class="text-sm text-slate-500 mt-2 mb-8 max-w-sm mx-auto">
            The attendance scanning has been moved to a dedicated full-screen Kiosk mode. Students can simply scan their ID barcode and the system will automatically log them in or out!
          </p>
          
          <button @click="router.push('/kiosk/attendance')" class="btn-primary px-8 py-3 text-base shadow-lg shadow-[#447794]/30">
            Launch Full-Screen Kiosk
          </button>
        </div>
      </div>

      <!-- Today's Log -->
      <div class="card overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <UserCircleIcon class="w-5 h-5 text-[#447794]" />
          <h2 class="font-semibold text-slate-800">Today's Log</h2>
          <span class="ml-auto text-xs text-slate-400">{{ logs.length }} entries</span>
        </div>
        <div class="overflow-y-auto max-h-80">
          <div v-if="loading" class="p-4 space-y-2">
            <div v-for="i in 5" :key="i" class="skeleton h-10 rounded-xl" />
          </div>
          <div v-else-if="logs.length === 0" class="py-10 text-center text-slate-400 text-sm">No logs yet today.</div>
          <div v-else class="divide-y divide-slate-50">
            <div v-for="log in logs" :key="log.id" class="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
              <span :class="['w-1.5 h-1.5 rounded-full flex-shrink-0', log.entryType === 'entry' ? 'bg-[#447794]' : 'bg-emerald-500']" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-800 truncate">
                  {{ log.user.firstName }} {{ log.user.lastName }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ log.user.department?.code ?? '' }} · {{ log.purpose ?? log.entryType }}
                </p>
              </div>
              <span class="text-xs text-slate-400 flex-shrink-0">{{ formatTime(log.scannedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
