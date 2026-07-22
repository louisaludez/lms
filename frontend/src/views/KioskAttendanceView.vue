<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, QrCodeIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const barcodeInput = ref<HTMLInputElement | null>(null)
const scanValue = ref('')
const scanning = ref(false)

// Set your exact ID length here (e.g., 12 characters: LUM-XXXXXXXX)
const REQUIRED_ID_LENGTH = 12

watch(scanValue, (newVal) => {
  if (!newVal || scanning.value) return

  // Instantly submit when the required length is reached
  if (newVal.length >= REQUIRED_ID_LENGTH) {
    processScan()
  }
})

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
    })
    
    result.value = {
      type: 'success',
      message: data.entryType === 'entry' ? 'You have successfully logged in.' : 'You have successfully logged out.',
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
    
    // Clear result after 2.5 seconds
    resultTimeout = window.setTimeout(() => {
      result.value = null
    }, 2500)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-[#1c0406] via-[#2d080d] to-[#0f0204] text-slate-100 flex flex-col items-center justify-center relative overflow-hidden font-sans">
    <!-- Top-left Exit Kiosk button -->
    <button 
      @click="router.push('/dashboard/attendance')" 
      tabindex="-1" 
      class="absolute top-8 left-8 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-rose-500/20 text-rose-100 hover:text-white transition-all duration-200 backdrop-blur-md flex items-center gap-2.5 text-sm font-medium shadow-lg hover:shadow-rose-600/20 group cursor-pointer"
    >
      <ArrowLeftIcon class="w-5 h-5 text-rose-300 group-hover:text-rose-100 transition-colors" />
      <span>Exit Kiosk</span>
    </button>

    <!-- Ambient background glows -->
    <div class="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#6B131D]/30 rounded-full blur-[140px] pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-rose-600/20 rounded-full blur-[140px] pointer-events-none"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] bg-[#8B1A28]/15 rounded-full blur-[150px] pointer-events-none"></div>

    <!-- Main Kiosk Glass Container -->
    <div class="relative z-10 w-full max-w-xl px-6">
      <div class="bg-[#2d090d]/80 backdrop-blur-2xl border border-rose-500/30 rounded-3xl p-8 md:p-12 shadow-2xl shadow-black/80 relative overflow-hidden">
        
        <!-- Top highlight line -->
        <div class="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-rose-400/40 to-transparent"></div>

        <div class="text-center space-y-8">
          <!-- Animated Icon Shield Container -->
          <div class="relative w-32 h-32 mx-auto">
            <!-- Pulsing outer aura ring -->
            <div class="absolute inset-0 rounded-3xl bg-rose-500/20 animate-ping opacity-40"></div>
            
            <div class="relative w-full h-full bg-gradient-to-br from-[#6B131D] to-[#4A0D14] rounded-3xl flex items-center justify-center shadow-2xl border border-rose-400/40 shadow-rose-600/30">
              <QrCodeIcon class="w-16 h-16 text-rose-200 animate-pulse" />
            </div>
          </div>

          <!-- Header Titles -->
          <div class="space-y-3">
            <h1 class="text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
              Please Scan Your ID
            </h1>
            <p class="text-rose-200/80 text-base md:text-lg font-normal max-w-md mx-auto leading-relaxed">
              Hold your ID card under the scanner, or type your ID number below.
            </p>
          </div>

          <!-- Input Form -->
          <form @submit.prevent="processScan" class="mt-8 relative max-w-md mx-auto">
            <div class="relative">
              <input 
                ref="barcodeInput"
                v-model="scanValue"
                type="text" 
                placeholder="Scan or type ID here..."
                class="w-full bg-[#180406]/90 border-2 border-rose-500/40 text-white placeholder-rose-300/40 rounded-2xl px-6 py-4.5 text-center text-xl font-mono tracking-wider focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/20 transition-all duration-200 shadow-inner"
                autocomplete="off"
                autofocus
                :readonly="scanning"
              />
              <div v-if="scanning" class="absolute right-4 top-1/2 -translate-y-1/2">
                <div class="w-5 h-5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <button type="submit" class="hidden">Submit</button>
          </form>
        </div>
      </div>
    </div>

    <!-- Floating Brief Toast for Result -->
    <transition name="modal-bounce">
      <div v-if="result" class="fixed top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div class="bg-[#2d090d]/95 backdrop-blur-xl border border-rose-400/30 rounded-2xl p-5 flex items-center gap-5 shadow-2xl shadow-black/90 min-w-[380px]">
          
          <template v-if="result.type === 'success'">
            <div :class="[
              'w-14 h-14 rounded-full flex items-center justify-center shadow-lg flex-shrink-0', 
              result.entryType === 'entry' ? 'shadow-emerald-500/30 bg-emerald-500/20 text-emerald-400' : 'shadow-rose-500/30 bg-rose-500/20 text-rose-300'
            ]">
              <CheckCircleIcon class="w-8 h-8" />
            </div>
            <div class="text-left flex-1">
              <h2 class="text-lg font-bold text-white tracking-tight">{{ result.userName }}</h2>
              <p :class="['font-semibold text-sm mt-0.5', result.entryType === 'entry' ? 'text-emerald-400' : 'text-rose-300']">
                {{ result.message }}
              </p>
            </div>
          </template>

          <template v-else>
            <div class="w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 bg-rose-500/20 text-rose-400 flex-shrink-0">
              <XCircleIcon class="w-8 h-8" />
            </div>
            <div class="text-left flex-1">
              <h2 class="text-lg font-bold text-white tracking-tight">Scan Failed</h2>
              <p class="text-rose-400 font-semibold text-sm mt-0.5">{{ result.message }}</p>
            </div>
          </template>

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
    transform: scale(0.8) translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
