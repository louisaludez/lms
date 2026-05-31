<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore, useLibraryStore } from '@/stores/useLibraryStore'
import { onMounted, computed } from 'vue'
import {
  BookOpenIcon, HomeIcon, ArrowsRightLeftIcon,
  ClipboardDocumentListIcon, ArrowRightOnRectangleIcon,
  ChartBarIcon, DocumentTextIcon,
  UserGroupIcon
} from '@heroicons/vue/24/outline'
import { useRouter } from 'vue-router'
import ndcLogo from '@/assets/ndc_logo.png'

const auth = useAuthStore()
const store = useLibraryStore()
const router = useRouter()
const route = useRoute()

onMounted(() => store.fetchStats())

function logout() {
  auth.logout()
  router.push('/login')
}

const navItems = computed(() => {
  const role = auth.user?.role || ''
  return [
    { to: '/dashboard', name: 'DashboardHome', label: 'Overview', icon: HomeIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/circulation', name: 'Circulation', label: 'Circulation', icon: ArrowsRightLeftIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/history', name: 'TransactionHistory', label: 'Transaction History', icon: DocumentTextIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/attendance', name: 'Attendance', label: 'Attendance', icon: ClipboardDocumentListIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/books', name: 'ManageBooks', label: 'Manage Items', icon: BookOpenIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/users', name: 'ManageUsers', label: 'Manage Users', icon: UserGroupIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/librarians', name: 'ManageLibrarians', label: 'Manage Librarians', icon: UserGroupIcon, roles: ['admin', 'chief_librarian'] },
    { to: '/dashboard/book-requests', name: 'ManageBookRequests', label: 'Book Requests', icon: DocumentTextIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/reports', name: 'ReportsView', label: 'Reports', icon: ChartBarIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
  ].filter(item => item.roles.includes(role))
})
</script>

<template>
  <div class="flex h-screen bg-slate-100 overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-64 bg-[#0e2236] flex flex-col flex-shrink-0">
      <!-- Logo -->
      <div class="h-16 flex items-center gap-3 px-5 border-b border-[#447794]/20">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center">
          <img :src="ndcLogo" class="w-full h-full object-contain" alt="NDC Logo" />
        </div>
        <div>
          <p class="text-white font-bold text-base leading-none">Lumina</p>
          <p class="text-[#80b3ce] text-[10px] font-medium">Library System</p>
        </div>
      </div>

      <!-- User info -->
      <div class="px-4 py-4 border-b border-[#447794]/20">
        <p class="text-white font-semibold text-sm">{{ auth.user?.firstName }} {{ auth.user?.lastName }}</p>
        <p class="text-[#80b3ce] text-xs capitalize">{{ auth.user?.role }}</p>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ active: route.name === item.name }"
        >
          <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
          {{ item.label }}
        </RouterLink>
      </nav>

      

      <!-- Logout -->
      <button @click="logout" class="flex items-center gap-3 px-5 py-4 text-[#80b3ce] hover:text-white hover:bg-white/5 transition-all text-sm border-t border-[#447794]/20">
        <ArrowRightOnRectangleIcon class="w-5 h-5" />
        Sign Out
      </button>
    </aside>

    <!-- Main content area -->
    <div class="flex-1 overflow-y-auto">
      <!-- Top bar -->
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
        <h1 class="text-lg font-semibold text-slate-800 capitalize">
          {{ route.name?.toString().replace(/([A-Z])/g, ' $1').trim() }}
        </h1>
        <RouterLink to="/opac" class="btn-ghost text-sm">
          <BookOpenIcon class="w-4 h-4" />
          View OPAC
        </RouterLink>
      </header>

      <main class="p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
