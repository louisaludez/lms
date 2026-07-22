<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/useLibraryStore'
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { 
  BookOpenIcon, 
  UserCircleIcon, 
  ArrowRightOnRectangleIcon, 
  DocumentTextIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon
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
  <nav class="sticky top-0 z-40 bg-[#6B131D] dark:bg-[#4A0D14] border-b border-white/10 shadow-md transition-colors">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
      <!-- Logo -->
      <router-link to="/opac" class="flex items-center gap-2.5 text-white font-bold text-lg hover:opacity-90 transition-opacity" @click="closeMobileMenu">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
          <img :src="ndcLogo" class="w-full h-full object-contain p-0.5" alt="NDC Logo" />
        </div>
        <span>Lumina</span>
      </router-link>

      <!-- Desktop Nav Links -->
      <div class="hidden md:flex items-center gap-1">
        <router-link
          to="/opac"
          class="px-4 py-1.5 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-white/20 !font-semibold shadow-xs"
        >
          Catalog
        </router-link>

        <router-link
          v-if="auth.isAuthenticated"
          to="/profile"
          class="px-4 py-1.5 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-white/20 !font-semibold shadow-xs"
        >
          Profile
        </router-link>

        <router-link
          v-if="auth.isFaculty"
          to="/dashboard/faculty-requests"
          class="px-4 py-1.5 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
          active-class="!text-white !bg-white/20 !font-semibold shadow-xs"
        >
          <DocumentTextIcon class="w-4 h-4" />
          My Requests
        </router-link>

        <router-link
          v-if="auth.isLibrarian"
          to="/dashboard"
          class="px-4 py-1.5 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-white/20 !font-semibold shadow-xs"
        >
          Dashboard
        </router-link>
      </div>

      <!-- User Menu, Theme Toggle & Mobile Toggle -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Theme Toggle Button -->
        <button
          @click="toggleTheme"
          class="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          aria-label="Toggle Theme"
        >
          <SunIcon v-if="isDark" class="w-5 h-5 text-amber-300 transition-transform duration-300 rotate-0 hover:rotate-45" />
          <MoonIcon v-else class="w-5 h-5 transition-transform duration-300 hover:-rotate-12" />
        </button>

        <div class="w-px h-5 bg-white/20 hidden sm:block"></div>

        <template v-if="auth.isAuthenticated">
          <router-link to="/profile" class="flex items-center gap-1.5 text-sm text-white/90 hover:text-white transition-colors" @click="closeMobileMenu">
            <UserCircleIcon class="w-5 h-5" />
            <span class="hidden sm:block font-medium">{{ auth.user?.firstName }}</span>
          </router-link>
          
          <div class="w-px h-5 bg-white/20 mx-1"></div>

          <button @click="logout" class="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors cursor-pointer">
            <ArrowRightOnRectangleIcon class="w-5 h-5" />
            <span class="hidden sm:block">Logout</span>
          </button>
        </template>
        <router-link v-else to="/login" class="bg-white text-[#6B131D] hover:bg-white/90 font-semibold text-sm py-1.5 px-4 rounded-full transition-all shadow-xs" @click="closeMobileMenu">
          <UserCircleIcon class="w-4 h-4 inline mr-1" />
          <span class="hidden sm:inline">Sign In</span>
          <span class="sm:hidden">Sign In</span>
        </router-link>

        <!-- Mobile Menu Button -->
        <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="md:hidden ml-2 text-white/90 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
          <Bars3Icon v-if="!isMobileMenuOpen" class="w-6 h-6" />
          <XMarkIcon v-else class="w-6 h-6" />
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-show="isMobileMenuOpen" class="md:hidden bg-[#55151c] dark:bg-[#35090F] border-t border-white/10 absolute w-full shadow-xl">
      <div class="px-4 pt-2 pb-4 space-y-1">
        <router-link
          to="/opac"
          @click="closeMobileMenu"
          class="block px-3 py-2 rounded-xl text-base font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-white/20"
        >
          Catalog
        </router-link>

        <router-link
          v-if="auth.isAuthenticated"
          to="/profile"
          @click="closeMobileMenu"
          class="block px-3 py-2 rounded-xl text-base font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-white/20"
        >
          Profile
        </router-link>

        <router-link
          v-if="auth.isFaculty"
          to="/dashboard/faculty-requests"
          @click="closeMobileMenu"
          class="flex items-center gap-2 px-3 py-2 rounded-xl text-base font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-white/20"
        >
          <DocumentTextIcon class="w-5 h-5" />
          My Requests
        </router-link>

        <router-link
          v-if="auth.isLibrarian"
          to="/dashboard"
          @click="closeMobileMenu"
          class="block px-3 py-2 rounded-xl text-base font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-white/20"
        >
          Dashboard
        </router-link>
      </div>
    </div>
  </nav>
</template>
