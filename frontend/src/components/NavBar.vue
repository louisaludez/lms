<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/useLibraryStore'
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BookOpenIcon,
  DocumentTextIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import ndcLogo from '@/assets/ndc_logo.png'

const auth = useAuthStore()
const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const isMobileMenuOpen = ref(false)

function logout() {
  auth.logout()
  isMobileMenuOpen.value = false
  router.push('/login')
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}
</script>

<template>
  <header class="md:hidden h-16 flex items-center gap-3 px-4 bg-[#6B131D] dark:bg-[#4A0D14] text-white print:hidden">
    <button
      @click="isMobileMenuOpen = !isMobileMenuOpen"
      class="p-2 -ml-2 rounded-md text-white/90 hover:bg-white/10"
      :aria-label="isMobileMenuOpen ? 'Close sidebar' : 'Open sidebar'"
      :aria-expanded="isMobileMenuOpen"
    >
      <XMarkIcon v-if="isMobileMenuOpen" class="w-6 h-6" />
      <Bars3Icon v-else class="w-6 h-6" />
    </button>
    <router-link to="/opac" class="flex items-center gap-2 text-white font-bold text-lg" @click="closeMobileMenu">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
        <img :src="ndcLogo" class="w-full h-full object-contain p-0.5" alt="NDC Logo" />
      </div>
      <span>Lumina</span>
    </router-link>
  </header>

  <div
    v-if="isMobileMenuOpen"
    class="fixed inset-0 z-40 bg-slate-950/50 md:hidden print:hidden"
    @click="closeMobileMenu"
  ></div>

  <aside
    :class="[
      'fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#6B131D] dark:bg-[#4A0D14] text-white shadow-xl transition-transform duration-300 print:hidden',
      isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    ]"
  >
    <div class="h-16 flex items-center gap-3 px-5 border-b border-white/10">
      <router-link to="/opac" class="flex items-center gap-3 min-w-0" @click="closeMobileMenu">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-white/10 flex-shrink-0">
          <img :src="ndcLogo" class="w-full h-full object-contain p-0.5" alt="NDC Logo" />
        </div>
        <span class="font-bold text-lg">Lumina</span>
      </router-link>
    </div>

    <div v-if="auth.isAuthenticated" class="px-5 py-4 border-b border-white/10">
      <p class="font-semibold text-sm truncate">{{ auth.user?.firstName }} {{ auth.user?.lastName }}</p>
      <p class="text-white/60 text-xs capitalize">{{ auth.user?.role }}</p>
    </div>

    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <router-link
        to="/opac"
        @click="closeMobileMenu"
        class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        active-class="!text-white !bg-white/20 !font-semibold"
      >
        <BookOpenIcon class="w-5 h-5 flex-shrink-0" />
        Catalog
      </router-link>

      <router-link
        v-if="auth.isAuthenticated"
        to="/profile"
        @click="closeMobileMenu"
        class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        active-class="!text-white !bg-white/20 !font-semibold"
      >
        <UserCircleIcon class="w-5 h-5 flex-shrink-0" />
        Profile
      </router-link>

      <router-link
        v-if="auth.isFaculty"
        to="/dashboard/faculty-requests"
        @click="closeMobileMenu"
        class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        active-class="!text-white !bg-white/20 !font-semibold"
      >
        <DocumentTextIcon class="w-5 h-5 flex-shrink-0" />
        My Requests
      </router-link>

      <router-link
        v-if="auth.isLibrarian"
        to="/dashboard"
        @click="closeMobileMenu"
        class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        active-class="!text-white !bg-white/20 !font-semibold"
      >
        <DocumentTextIcon class="w-5 h-5 flex-shrink-0" />
        Dashboard
      </router-link>
    </nav>

    <div class="px-3 py-3 border-t border-white/10 space-y-1">
      <button
        @click="toggleTheme"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        aria-label="Toggle Theme"
      >
        <SunIcon v-if="isDark" class="w-5 h-5 flex-shrink-0 text-amber-300" />
        <MoonIcon v-else class="w-5 h-5 flex-shrink-0" />
        {{ isDark ? 'Light Mode' : 'Dark Mode' }}
      </button>

      <button
        v-if="auth.isAuthenticated"
        @click="logout"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
      >
        <ArrowRightOnRectangleIcon class="w-5 h-5 flex-shrink-0" />
        Sign Out
      </button>
      <router-link
        v-else
        to="/login"
        @click="closeMobileMenu"
        class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        active-class="!text-white !bg-white/20 !font-semibold"
      >
        <UserCircleIcon class="w-5 h-5 flex-shrink-0" />
        Sign In
      </router-link>
    </div>
  </aside>
</template>
