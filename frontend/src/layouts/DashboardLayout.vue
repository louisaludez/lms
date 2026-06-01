<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore, useLibraryStore } from '@/stores/useLibraryStore'
import { onMounted, computed, ref } from 'vue'
import {
  BookOpenIcon, HomeIcon, ArrowsRightLeftIcon,
  ClipboardDocumentListIcon, ArrowRightOnRectangleIcon,
  ChartBarIcon, DocumentTextIcon,
  UserGroupIcon,
  Bars3Icon, XMarkIcon
} from '@heroicons/vue/24/outline'
import { useRouter } from 'vue-router'
import ndcLogo from '@/assets/ndc_logo.png'

const auth = useAuthStore()
const store = useLibraryStore()
const router = useRouter()
const route = useRoute()

const isMobileSidebarOpen = ref(false)

onMounted(() => store.fetchStats())

function logout() {
  auth.logout()
  router.push('/login')
}

function closeMobileSidebar() {
  isMobileSidebarOpen.value = false
}

const navItems = computed(() => {
  const role = auth.user?.role || ''
  return [
    { to: '/dashboard', name: 'DashboardHome', label: 'Dashboard  ', icon: HomeIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
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
  <div class="flex h-screen bg-slate-100 overflow-hidden relative print:h-auto print:overflow-visible print:bg-white">
    
    <!-- Mobile Sidebar Overlay -->
    <div 
      v-if="isMobileSidebarOpen"
      class="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity print:hidden"
      @click="closeMobileSidebar"
    ></div>

    <!-- Sidebar -->
    <aside 
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 bg-[#0e2236] flex flex-col flex-shrink-0 transform transition-transform duration-300 md:relative md:translate-x-0 print:hidden',
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center justify-between px-5 border-b border-[#447794]/20">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center">
            <img :src="ndcLogo" class="w-full h-full object-contain" alt="NDC Logo" />
          </div>
          <div>
            <p class="text-white font-bold text-base leading-none">Lumina</p>
            <p class="text-[#80b3ce] text-[10px] font-medium">Library System</p>
          </div>
        </div>
        <!-- Close button on mobile -->
        <button @click="closeMobileSidebar" class="md:hidden text-[#80b3ce] hover:text-white p-1">
          <XMarkIcon class="w-6 h-6" />
        </button>
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
          @click="closeMobileSidebar"
        >
          <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <!-- Logout -->
      <button @click="logout" class="flex items-center gap-3 px-5 py-4 text-[#80b3ce] hover:text-white hover:bg-white/5 transition-all text-sm border-t border-[#447794]/20 mt-auto">
        <ArrowRightOnRectangleIcon class="w-5 h-5" />
        Sign Out
      </button>
    </aside>

    <!-- Main content area -->
    <div class="flex-1 overflow-y-auto flex flex-col min-w-0 print:overflow-visible">
      <!-- Top bar -->
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 flex-shrink-0 print:hidden">
        <div class="flex items-center gap-3">
          <!-- Hamburger menu button -->
          <button @click="isMobileSidebarOpen = true" class="md:hidden text-slate-500 hover:text-slate-700 p-1 -ml-2 rounded-md hover:bg-slate-100">
            <Bars3Icon class="w-6 h-6" />
          </button>
          <h1 class="text-lg font-semibold text-slate-800 capitalize truncate max-w-[150px] sm:max-w-none">
            {{ route.name?.toString().replace(/([A-Z])/g, ' $1').trim() }}
          </h1>
        </div>
        <RouterLink to="/opac" class="btn-ghost text-sm flex-shrink-0">
          <BookOpenIcon class="w-4 h-4" />
          <span class="hidden sm:inline">View OPAC</span>
          <span class="sm:hidden">OPAC</span>
        </RouterLink>
      </header>

      <main class="p-4 sm:p-6 flex-1 print:p-0 print:overflow-visible">
        <RouterView />
      </main>
    </div>
  </div>
</template>
