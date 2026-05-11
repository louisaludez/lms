<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const barcodeInput = ref<HTMLInputElement | null>(null)
const scanValue = ref('')
const scanning = ref(false)

const result = ref<{
  type: 'success' | 'error',
  message: string,
  userName?: string,
  entryType?: string,
} | null>(null)

let resultTimeout: number | null = null

// Keep input focused
function focusInput() {
  if (barcodeInput.value) barcodeInput.value.focus()
}

onMounted(() => {
  focusInput()
  document.addEventListener('click', focusInput)
})

onUnmounted(() => {
  document.removeEventListener('click', focusInput)
})

async function processScan() {
  if (!scanValue.value || scanning.value) return
  
  scanning.value = true
  if (resultTimeout) clearTimeout(resultTimeout)
  
  try {
    const { data } = await api.post('/attendance/scan', {
      userBarcode: scanValue.value
      // entryType is now automatically calculated by the backend!
    })
    
    result.value = {
      type: 'success',
      message: data.entryType === 'entry' ? 'Welcome to the Library!' : 'Goodbye! Have a great day!',
      userName: `${data.user.firstName} ${data.user.lastName}`,
      entryType: data.entryType
    }
  } catch (e: any) {
    result.value = {
      type: 'error',
      message: e.response?.data?.message ?? 'Invalid ID Card'
    }
  } finally {
    scanValue.value = ''
    scanning.value = false
    nextTick(focusInput)
    
    // Clear result after 3 seconds
    resultTimeout = window.setTimeout(() => {
      result.value = null
    }, 4000)
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#061222] flex flex-col items-center justify-center relative overflow-hidden">
    <!-- Top-left back button -->
    <button @click="router.push('/dashboard/attendance')" class="absolute top-8 left-8 text-slate-400 hover:text-white transition flex items-center gap-2">
      <ArrowLeftIcon class="w-6 h-6" />
      <span class="font-medium">Exit Kiosk</span>
    </button>
    
    <!-- Decorative background glow -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#447794]/20 rounded-full blur-[120px] pointer-events-none"></div>

    <div class="relative z-10 w-full max-w-2xl px-6 text-center">
      <!-- Always visible scan prompt -->
      <div class="space-y-8">
        <div class="w-32 h-32 mx-auto bg-[#123249] rounded-3xl flex items-center justify-center shadow-2xl border border-white/5 shadow-[#447794]/20">
          <svg class="w-16 h-16 text-[#80b3ce] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM13.5 18a.375.375 0 00-.375.375V21h4.5v-2.625a.375.375 0 00-.375-.375h-3.75z" />
          </svg>
        </div>
        <div>
          <h1 class="text-4xl md:text-5xl font-bold text-white tracking-tight">Please Scan Your ID</h1>
          <p class="text-slate-400 mt-4 text-lg">Hold your ID card under the scanner, or type your ID below.</p>
        </div>

        <form @submit.prevent="processScan" class="mt-10 relative max-w-sm mx-auto">
          <input 
            ref="barcodeInput"
            v-model="scanValue"
            type="text" 
            placeholder="Scan or type ID here..."
            class="w-full bg-[#123249]/50 border-2 border-[#447794]/30 text-white placeholder-slate-500 rounded-2xl px-6 py-4 text-center text-xl font-mono focus:outline-none focus:border-[#447794] focus:ring-4 focus:ring-[#447794]/20 transition-all shadow-inner"
            autocomplete="off"
            autofocus
            :disabled="scanning"
          />
          <button type="submit" class="hidden">Submit</button>
        </form>
      </div>
    </div>

    <!-- Floating Modal Popup for Result -->
    <transition name="modal-bounce">
      <div v-if="result" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061222]/80 backdrop-blur-sm">
        <div class="bg-[#0b1f33] border border-white/10 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl shadow-black/50 transform transition-all">
          
          <div v-if="result.type === 'success'" class="space-y-4">
            <div :class="['w-24 h-24 mx-auto rounded-full flex items-center justify-center shadow-xl', 
                result.entryType === 'entry' ? 'shadow-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'shadow-blue-500/20 bg-blue-500/10 text-blue-400']">
              <CheckCircleIcon class="w-16 h-16" />
            </div>
            <h2 class="text-3xl font-bold text-white mt-6 tracking-tight">{{ result.userName }}</h2>
            <p :class="['font-medium text-xl mt-2', result.entryType === 'entry' ? 'text-emerald-400' : 'text-blue-400']">{{ result.message }}</p>
          </div>

          <div v-else class="space-y-4">
            <div class="w-24 h-24 mx-auto rounded-full flex items-center justify-center shadow-xl shadow-rose-500/20 bg-rose-500/10 text-rose-500">
              <XCircleIcon class="w-16 h-16" />
            </div>
            <h2 class="text-3xl font-bold text-white mt-6 tracking-tight">Scan Failed</h2>
            <p class="text-rose-400 font-medium text-lg mt-2">{{ result.message }}</p>
          </div>

        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.modal-bounce-enter-active {
  animation: modal-bounce-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-bounce-leave-active {
  animation: modal-bounce-in 0.3s ease-in reverse;
}
@keyframes modal-bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
