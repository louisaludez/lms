<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useLibraryStore'
import { BookOpenIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

async function handleLogin() {
  try {
    await auth.login(email.value, password.value)
    const redirect = (router.currentRoute.value.query.redirect as string) || '/opac'
    router.push(redirect)
  } catch { /* error shown via auth.error */ }
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
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#447794] to-[#2D5B75] mb-4 shadow-xl">
          <BookOpenIcon class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-white">Lumina</h1>
        <p class="text-[#80b3ce] text-sm mt-1">Library Management System</p>
      </div>

      <!-- Card -->
      <div class="bg-[#0e2236] rounded-3xl p-8 shadow-2xl border border-[#447794]/20">
        <h2 class="text-xl font-semibold text-white mb-2">Welcome back</h2>
        <p class="text-[#80b3ce] text-sm mb-7">Sign in to access the library catalog and your account.</p>

        <!-- Error -->
        <div v-if="auth.error" class="mb-5 p-4 rounded-xl bg-rose-900/30 border border-rose-700/40 text-rose-300 text-sm">
          {{ auth.error }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Email -->
          <div>
            <label for="login-email" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">Email Address</label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              required
              autofocus
              autocomplete="email"
              placeholder="you@student.edu.ph"
              class="input bg-[#123249] border-[#447794]/30 text-white placeholder:text-slate-500 focus:ring-[#447794]/40 focus:border-[#447794]"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="login-password" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">Password</label>
            <div class="relative">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
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

          <button
            type="submit"
            :disabled="auth.loading"
            class="btn-primary w-full justify-center py-3 text-base mt-2"
          >
            <svg v-if="auth.loading" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ auth.loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <p class="text-center text-sm text-[#80b3ce] mt-6">
          New here?
          <router-link to="/signup" class="text-[#447794] hover:text-[#80b3ce] font-semibold transition-colors">
            Create an account
          </router-link>
        </p>
        <p class="text-center text-sm text-[#80b3ce] mt-3">
          Just browsing?
          <router-link to="/opac" class="text-[#447794] hover:text-[#80b3ce] font-semibold transition-colors">
            Search the catalog
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
