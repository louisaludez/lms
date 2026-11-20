<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/axios'
import { BookOpenIcon, KeyIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import ndcLogo from '@/assets/ndc_logo.png'

const router = useRouter()
const route = useRoute()

const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref(false)
const token = ref('')
const email = ref('')

onMounted(() => {
  // Get token and email from query params
  token.value = route.query.token as string || ''
  email.value = route.query.email as string || ''

  if (!token.value || !email.value) {
    error.value = 'Invalid or missing reset link. Please request a new password reset.'
  }
})

async function handleResetPassword() {
  error.value = ''
  success.value = false

  if (!token.value || !email.value) {
    error.value = 'Invalid reset link. Please request a new password reset.'
    return
  }

  if (newPassword.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true

  try {
    await api.post('/auth/reset-password', {
      token: token.value,
      email: email.value,
      newPassword: newPassword.value
    })
    success.value = true
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'Failed to reset password. The link may have expired or already been used.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-[#061222] flex items-center justify-center p-4">
    <!-- Background decoration -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#447794]/10 blur-3xl" />
      <div class="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#2D5B75]/10 blur-3xl" />
    </div>

    <div class="relative w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-28 h-28 mb-4">
          <img :src="ndcLogo" class="w-full h-full object-contain drop-shadow-xl" alt="NDC Logo" />
        </div>
        <h1 class="text-3xl font-bold text-white">Lumina</h1>
        <p class="text-[#80b3ce] text-sm mt-1">Library Management System</p>
      </div>

      <!-- Card -->
      <div class="bg-[#0e2236] rounded-3xl p-8 shadow-2xl border border-[#447794]/20">
        <div v-if="!success">
          <h2 class="text-xl font-semibold text-white mb-2 flex items-center justify-center gap-2">
            <KeyIcon class="w-6 h-6 text-[#447794]" />
            Reset Password
          </h2>
          <p class="text-[#80b3ce] text-sm mb-7 text-center">Enter your new password below. This link expires in 1 hour.</p>

          <!-- Error -->
          <div v-if="error" class="mb-5 p-4 rounded-xl bg-rose-900/30 border border-rose-700/40 text-rose-300 text-sm">
            {{ error }}
          </div>

          <form v-if="!error || success" @submit.prevent="handleResetPassword" class="space-y-4">
            <!-- New Password -->
            <div>
              <label for="new-password" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">New Password</label>
              <div class="relative">
                <input
                  id="new-password"
                  v-model="newPassword"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="new-password"
                  placeholder="••••••••"
                  class="input bg-[#123249] border-[#447794]/30 text-white placeholder:text-slate-500 focus:ring-[#447794]/40 focus:border-[#447794] pr-12"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <EyeSlashIcon v-if="showPassword" class="w-5 h-5" />
                  <EyeIcon v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- Confirm Password -->
            <div>
              <label for="confirm-password" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">Confirm New Password</label>
              <div class="relative">
                <input
                  id="confirm-password"
                  v-model="confirmPassword"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="new-password"
                  placeholder="••••••••"
                  class="input bg-[#123249] border-[#447794]/30 text-white placeholder:text-slate-500 focus:ring-[#447794]/40 focus:border-[#447794] pr-12"
                />
              </div>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="btn-primary w-full justify-center py-3 text-base mt-2"
            >
              <svg v-if="loading" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ loading ? 'Resetting...' : 'Reset Password' }}
            </button>
          </form>
        </div>

        <!-- Success State -->
        <div v-else class="text-center py-8">
          <div class="w-20 h-20 rounded-full bg-emerald-100/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircleIcon class="w-10 h-10 text-emerald-500" />
          </div>
          <h3 class="text-xl font-semibold text-white mb-3">Password Reset Successful</h3>
          <p class="text-[#80b3ce] text-sm mb-6">Your password has been updated. You can now sign in with your new password.</p>
          <router-link to="/login" class="btn-primary w-full justify-center inline-flex">
            Sign In
          </router-link>
        </div>

        <p class="text-center text-sm text-[#80b3ce] mt-6">
          <router-link to="/login" class="text-[#447794] hover:text-[#80b3ce] font-semibold transition-colors">
            Back to Sign In
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>