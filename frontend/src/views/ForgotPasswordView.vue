<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import { BookOpenIcon, KeyIcon, EnvelopeIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import ndcLogo from '@/assets/ndc_logo.png'

const router = useRouter()

const email = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)
const successMessage = ref('')

async function handleForgotPassword() {
  error.value = ''
  success.value = false
  loading.value = true

  try {
    await api.post('/auth/forgot-password', { email: email.value })
    success.value = true
    successMessage.value = 'If the email exists in our system, a password reset link has been sent. Please check your inbox.'
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'Failed to send reset email. Please try again.'
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
            Forgot Password
          </h2>
          <p class="text-[#80b3ce] text-sm mb-7 text-center">Enter your registered email address to receive a password reset link.</p>

          <!-- Error -->
          <div v-if="error" class="mb-5 p-4 rounded-xl bg-rose-900/30 border border-rose-700/40 text-rose-300 text-sm">
            {{ error }}
          </div>

          <form @submit.prevent="handleForgotPassword" class="space-y-4">
            <!-- Email -->
            <div>
              <label for="forgot-email" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">Email Address</label>
              <div class="relative">
                <EnvelopeIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="forgot-email"
                  v-model="email"
                  type="email"
                  required
                  autofocus
                  autocomplete="email"
                  placeholder="you@student.edu.ph"
                  class="input bg-[#123249] border-[#447794]/30 text-white placeholder:text-slate-500 focus:ring-[#447794]/40 focus:border-[#447794] pl-10"
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
              {{ loading ? 'Sending...' : 'Send Reset Link' }}
            </button>
          </form>
        </div>

        <!-- Success State -->
        <div v-else class="text-center py-8">
          <div class="w-20 h-20 rounded-full bg-emerald-100/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircleIcon class="w-10 h-10 text-emerald-500" />
          </div>
          <h3 class="text-xl font-semibold text-white mb-3">Check Your Email</h3>
          <p class="text-[#80b3ce] text-sm mb-6">{{ successMessage }}</p>
          <router-link to="/login" class="btn-primary w-full justify-center inline-flex">
            Back to Sign In
          </router-link>
        </div>

        <p class="text-center text-sm text-[#80b3ce] mt-6">
          Remember your password?
          <router-link to="/login" class="text-[#447794] hover:text-[#80b3ce] font-semibold transition-colors ml-1">
            Sign In
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>