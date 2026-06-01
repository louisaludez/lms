<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/useLibraryStore'
import { useRouter } from 'vue-router'
import { 
  BookOpenIcon, 
  UserCircleIcon, 
  ArrowRightOnRectangleIcon, 
  DocumentTextIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import ndcLogo from '@/assets/ndc_logo.png'

const auth = useAuthStore()
const router = useRouter()
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
  <nav class="sticky top-0 z-40 bg-[#123249] border-b border-[#447794]/20 shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
      <!-- Logo -->
      <router-link to="/opac" class="flex items-center gap-2.5 text-white font-bold text-lg hover:opacity-80 transition-opacity" @click="closeMobileMenu">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center">
          <img :src="ndcLogo" class="w-full h-full object-contain" alt="NDC Logo" />
        </div>
        Lumina
      </router-link>

      <!-- Desktop Nav Links -->
      <div class="hidden md:flex items-center gap-1">
        <router-link
          to="/opac"
          class="px-4 py-2 rounded-xl text-sm font-medium text-[#aed0e2] hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-[#447794]/40"
        >
          Catalog
        </router-link>

        <router-link
          v-if="auth.isAuthenticated"
          to="/profile"
          class="px-4 py-2 rounded-xl text-sm font-medium text-[#aed0e2] hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-[#447794]/40"
        >
          Profile
        </router-link>

        <router-link
          v-if="auth.isFaculty"
          to="/faculty/requests"
          class="px-4 py-2 rounded-xl text-sm font-medium text-[#aed0e2] hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
          active-class="!text-white !bg-[#447794]/40"
        >
          <DocumentTextIcon class="w-4 h-4" />
          My Requests
        </router-link>

        <router-link
          v-if="auth.isLibrarian"
          to="/dashboard"
          class="px-4 py-2 rounded-xl text-sm font-medium text-[#aed0e2] hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-[#447794]/40"
        >
          Dashboard
        </router-link>
      </div>

      <!-- User Menu & Mobile Toggle -->
      <div class="flex items-center gap-2 sm:gap-3">
        <template v-if="auth.isAuthenticated">
          <router-link to="/profile" class="flex items-center gap-1.5 text-sm text-[#aed0e2] hover:text-white transition-colors" @click="closeMobileMenu">
            <UserCircleIcon class="w-5 h-5" />
            <span class="hidden sm:block">{{ auth.user?.firstName }}</span>
          </router-link>
          
          <div class="w-px h-5 bg-[#447794]/30 mx-1"></div>

          <button @click="logout" class="flex items-center gap-1.5 text-[#aed0e2] hover:text-white text-sm transition-colors">
            <ArrowRightOnRectangleIcon class="w-5 h-5" />
            <span class="hidden sm:block">Logout</span>
          </button>
        </template>
        <router-link v-else to="/login" class="btn-primary text-sm py-2 px-3 sm:px-4" @click="closeMobileMenu">
          <UserCircleIcon class="w-4 h-4" />
          <span class="hidden sm:inline">Sign In</span>
          <span class="sm:hidden">Sign In</span>
        </router-link>

        <!-- Mobile Menu Button -->
        <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="md:hidden ml-2 text-[#aed0e2] hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
          <Bars3Icon v-if="!isMobileMenuOpen" class="w-6 h-6" />
          <XMarkIcon v-else class="w-6 h-6" />
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-show="isMobileMenuOpen" class="md:hidden bg-[#0d2538] border-t border-[#447794]/20 absolute w-full shadow-xl">
      <div class="px-4 pt-2 pb-4 space-y-1">
        <router-link
          to="/opac"
          @click="closeMobileMenu"
          class="block px-3 py-2.5 rounded-xl text-base font-medium text-[#aed0e2] hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-[#447794]/40"
        >
          Catalog
        </router-link>

        <router-link
          v-if="auth.isAuthenticated"
          to="/profile"
          @click="closeMobileMenu"
          class="block px-3 py-2.5 rounded-xl text-base font-medium text-[#aed0e2] hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-[#447794]/40"
        >
          Profile
        </router-link>

        <router-link
          v-if="auth.isFaculty"
          to="/faculty/requests"
          @click="closeMobileMenu"
          class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-base font-medium text-[#aed0e2] hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-[#447794]/40"
        >
          <DocumentTextIcon class="w-5 h-5" />
          My Requests
        </router-link>

        <router-link
          v-if="auth.isLibrarian"
          to="/dashboard"
          @click="closeMobileMenu"
          class="block px-3 py-2.5 rounded-xl text-base font-medium text-[#aed0e2] hover:text-white hover:bg-white/10 transition-all"
          active-class="!text-white !bg-[#447794]/40"
        >
          Dashboard
        </router-link>
      </div>
    </div>
  </nav>
</template>
