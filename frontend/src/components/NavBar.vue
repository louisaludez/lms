<script setup lang="ts">
import { useAuthStore } from '@/stores/useLibraryStore'
import { useRouter } from 'vue-router'
import { BookOpenIcon, UserCircleIcon, ArrowRightOnRectangleIcon, DocumentTextIcon } from '@heroicons/vue/24/outline'
import ndcLogo from '@/assets/ndc_logo.png'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="sticky top-0 z-40 bg-[#123249] border-b border-[#447794]/20 shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
      <!-- Logo -->
      <router-link to="/opac" class="flex items-center gap-2.5 text-white font-bold text-lg hover:opacity-80 transition-opacity">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center">
          <img :src="ndcLogo" class="w-full h-full object-contain" alt="NDC Logo" />
        </div>
        Lumina
      </router-link>

      <!-- Nav Links -->
      <div class="flex items-center gap-1">
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

      <!-- User Menu -->
      <div class="flex items-center gap-3">
        <template v-if="auth.isAuthenticated">
          <router-link to="/profile" class="flex items-center gap-1.5 text-sm text-[#aed0e2] hover:text-white transition-colors">
            <UserCircleIcon class="w-5 h-5" />
            <span class="hidden sm:block">{{ auth.user?.firstName }}</span>
          </router-link>
          
          <div class="w-px h-5 bg-[#447794]/30 mx-1"></div>

          <button @click="logout" class="flex items-center gap-1.5 text-[#aed0e2] hover:text-white text-sm transition-colors">
            <ArrowRightOnRectangleIcon class="w-5 h-5" />
            <span class="hidden sm:block">Logout</span>
          </button>
        </template>
        <router-link v-else to="/login" class="btn-primary text-sm py-2">
          <UserCircleIcon class="w-4 h-4" />
          Sign In
        </router-link>
      </div>
    </div>
  </nav>
</template>
