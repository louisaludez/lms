<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, QrCodeIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{ isModal?: boolean }>()
const emit = defineEmits(['close'])

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

function exitKiosk() {
  if (props.isModal) {
    emit('close')
  } else {
    router.push('/dashboard/attendance')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-[#FAF7F2] via-[#F3EFE6] to-[#E9E1D3] text-[#2C221E] flex flex-col items-center justify-center relative overflow-hidden font-sans">
    <!-- Top-left Exit Kiosk button -->
    <button 
      @click="exitKiosk" 
      tabindex="-1" 
      class="absolute top-8 left-8 px-4 py-2.5 rounded-xl bg-white/70 hover:bg-white border border-[#E0D4C3] text-[#4A3E37] hover:text-[#6B131D] transition-all duration-200 backdrop-blur-md flex items-center gap-2.5 text-sm font-semibold shadow-sm hover:shadow-md hover:border-[#6B131D]/30 group cursor-pointer z-50"
    >
      <ArrowLeftIcon class="w-5 h-5 text-[#8C7A6B] group-hover:text-[#6B131D] transition-colors" />
      <span>Exit Kiosk</span>
    </button>

    <!-- Ambient background glows -->
    <div class="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#E5D7C3]/60 rounded-full blur-[140px] pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#6B131D]/08 rounded-full blur-[140px] pointer-events-none"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] bg-[#DFD2BF]/50 rounded-full blur-[150px] pointer-events-none"></div>

    <!-- Main Kiosk Glass Container -->
    <div class="relative z-10 w-full max-w-xl px-6">
      <div class="bg-white/85 backdrop-blur-2xl border border-[#E4DACB] rounded-3xl p-8 md:p-12 shadow-2xl shadow-[#362B24]/10 relative overflow-hidden">
        
        <!-- Top highlight line -->
        <div class="absolute top-0 left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-[#6B131D]/30 to-transparent"></div>

        <div class="text-center space-y-8">
          <!-- Animated Icon Shield Container -->
          <div class="relative w-32 h-32 mx-auto">
            <!-- Pulsing outer aura ring -->
            <div class="absolute inset-0 rounded-3xl bg-[#6B131D]/15 animate-ping opacity-60"></div>
            
            <div class="relative w-full h-full bg-gradient-to-br from-[#6B131D] via-[#7D1924] to-[#520E15] rounded-3xl flex items-center justify-center shadow-xl border border-[#9E2B37]/40 shadow-[#6B131D]/25">
              <QrCodeIcon class="w-16 h-16 text-[#FAF5EC] animate-pulse" />
            </div>
          </div>

          <!-- Header Titles -->
          <div class="space-y-3">
            <h1 class="text-3xl md:text-4xl font-extrabold text-[#2C221E] tracking-tight">
              Please Scan Your ID
            </h1>
            <p class="text-[#6E615A] text-base md:text-lg font-medium max-w-md mx-auto leading-relaxed">
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
                class="w-full bg-[#FAF7F2] border-2 border-[#DCD0C0] text-[#2C221E] placeholder-[#A09388] rounded-2xl px-6 py-4.5 text-center text-xl font-mono tracking-wider focus:outline-none focus:border-[#6B131D] focus:ring-4 focus:ring-[#6B131D]/15 transition-all duration-200 shadow-inner"
                autocomplete="off"
                autofocus
                :readonly="scanning"
              />
              <div v-if="scanning" class="absolute right-4 top-1/2 -translate-y-1/2">
                <div class="w-5 h-5 border-2 border-[#6B131D] border-t-transparent rounded-full animate-spin"></div>
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
        <div class="bg-white/95 backdrop-blur-xl border border-[#E4DACB] rounded-2xl p-5 flex items-center gap-5 shadow-2xl shadow-[#2C221E]/15 min-w-[380px]">
          
          <template v-if="result.type === 'success'">
            <div :class="[
              'w-14 h-14 rounded-full flex items-center justify-center shadow-md flex-shrink-0 border', 
              result.entryType === 'entry' ? 'shadow-emerald-500/20 bg-emerald-50 text-emerald-600 border-emerald-200' : 'shadow-amber-500/20 bg-amber-50 text-amber-700 border-amber-200'
            ]">
              <CheckCircleIcon class="w-8 h-8" />
            </div>
            <div class="text-left flex-1">
              <h2 class="text-lg font-bold text-[#2C221E] tracking-tight">{{ result.userName }}</h2>
              <p :class="['font-semibold text-sm mt-0.5', result.entryType === 'entry' ? 'text-emerald-700' : 'text-amber-700']">
                {{ result.message }}
              </p>
            </div>
          </template>

          <template v-else>
            <div class="w-14 h-14 rounded-full flex items-center justify-center shadow-md shadow-rose-500/20 bg-rose-50 text-rose-600 border border-rose-200 flex-shrink-0">
              <XCircleIcon class="w-8 h-8" />
            </div>
            <div class="text-left flex-1">
              <h2 class="text-lg font-bold text-[#2C221E] tracking-tight">Scan Failed</h2>
              <p class="text-rose-600 font-semibold text-sm mt-0.5">{{ result.message }}</p>
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
