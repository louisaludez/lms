<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useLibraryStore'
import {
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldExclamationIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'

const auth = useAuthStore()
const router = useRouter()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const isMinLength = computed(() => newPassword.value.length >= 8)
const isDifferent = computed(() => newPassword.value && currentPassword.value && newPassword.value !== currentPassword.value)
const isMatch = computed(() => newPassword.value && confirmPassword.value && newPassword.value === confirmPassword.value)
const isValid = computed(() => isMinLength.value && isDifferent.value && isMatch.value)

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!currentPassword.value) {
    errorMessage.value = 'Please enter your current temporary password.'
    return
  }
  if (!isMinLength.value) {
    errorMessage.value = 'New password must be at least 8 characters long.'
    return
  }
  if (currentPassword.value === newPassword.value) {
    errorMessage.value = 'New password cannot be the same as your current password.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'New passwords do not match.'
    return
  }

  submitting.value = true
  try {
    await auth.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    successMessage.value = 'Password changed successfully! Redirecting...'
    setTimeout(() => {
      // Refresh current profile to ensure everything is synced
      auth.fetchMe()
    }, 1000)
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || err.message || 'Failed to update password. Please check your current password.'
  } finally {
    submitting.value = false
  }
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div 
    v-if="auth.isAuthenticated && auth.user?.mustChangePassword" 
    class="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md"
    aria-modal="true"
    role="dialog"
  >
    <div class="relative w-full max-w-md bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-2xl overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Top Accent Bar -->
      <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#6B131D] via-[#932730] to-[#cb4e57]"></div>

      <!-- Header Icon & Titles -->
      <div class="text-left mb-6">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 shadow-xs">
          <KeyIcon class="w-6 h-6 stroke-[1.8]" />
        </div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Password Change Required
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          Your account was provisioned with a temporary password. To protect your student account, please set a new personal password before accessing the library.
        </p>
      </div>

      <!-- Feedback Alerts -->
      <div v-if="errorMessage" class="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
        <ShieldExclamationIcon class="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="successMessage" class="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
        <CheckCircleIcon class="w-4 h-4 flex-shrink-0 text-emerald-500" />
        <span>{{ successMessage }}</span>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Current Password -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Current Temporary Password *
          </label>
          <div class="relative">
            <input
              v-model="currentPassword"
              :type="showCurrent ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="input pr-10 text-sm"
            />
            <button
              type="button"
              @click="showCurrent = !showCurrent"
              tabindex="-1"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <EyeSlashIcon v-if="showCurrent" class="w-4 h-4" />
              <EyeIcon v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- New Password -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            New Password *
          </label>
          <div class="relative">
            <input
              v-model="newPassword"
              :type="showNew ? 'text' : 'password'"
              required
              minlength="8"
              autocomplete="new-password"
              placeholder="Minimum 8 characters"
              class="input pr-10 text-sm"
            />
            <button
              type="button"
              @click="showNew = !showNew"
              tabindex="-1"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <EyeSlashIcon v-if="showNew" class="w-4 h-4" />
              <EyeIcon v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Confirm Password -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Confirm New Password *
          </label>
          <div class="relative">
            <input
              v-model="confirmPassword"
              :type="showConfirm ? 'text' : 'password'"
              required
              autocomplete="new-password"
              placeholder="Re-enter new password"
              class="input pr-10 text-sm"
            />
            <button
              type="button"
              @click="showConfirm = !showConfirm"
              tabindex="-1"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <EyeSlashIcon v-if="showConfirm" class="w-4 h-4" />
              <EyeIcon v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Micro-Validation Checklist -->
        <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/40 text-[11px] space-y-1 text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-1.5" :class="{ 'text-emerald-600 dark:text-emerald-400 font-semibold': isMinLength }">
            <span class="w-1.5 h-1.5 rounded-full" :class="isMinLength ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'"></span>
            <span>At least 8 characters in length</span>
          </div>
          <div class="flex items-center gap-1.5" :class="{ 'text-emerald-600 dark:text-emerald-400 font-semibold': isDifferent }">
            <span class="w-1.5 h-1.5 rounded-full" :class="isDifferent ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'"></span>
            <span>Must differ from temporary password</span>
          </div>
          <div class="flex items-center gap-1.5" :class="{ 'text-emerald-600 dark:text-emerald-400 font-semibold': isMatch }">
            <span class="w-1.5 h-1.5 rounded-full" :class="isMatch ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'"></span>
            <span>Both password fields match</span>
          </div>
        </div>

        <!-- Submit & Sign Out Actions -->
        <div class="pt-2 flex flex-col gap-2.5">
          <button
            type="submit"
            :disabled="submitting || !isValid"
            class="btn-primary w-full justify-center py-2.5 text-sm font-semibold shadow-md shadow-[#6B131D]/20"
          >
            <span v-if="!submitting">Set New Password & Continue</span>
            <span v-else class="flex items-center gap-2">
              <span class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>Updating Password...</span>
            </span>
          </button>

          <button
            type="button"
            @click="handleLogout"
            class="w-full py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowRightOnRectangleIcon class="w-3.5 h-3.5" />
            <span>Sign out instead</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

