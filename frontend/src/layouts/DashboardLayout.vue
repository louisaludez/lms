<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore, useLibraryStore } from '@/stores/useLibraryStore'
import { onMounted, computed, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import {
  BookOpenIcon, HomeIcon, ArrowsRightLeftIcon,
  ClipboardDocumentListIcon, ArrowRightOnRectangleIcon,
  ChartBarIcon, DocumentTextIcon,
  UserGroupIcon,
  Bars3Icon, XMarkIcon,
  SunIcon, MoonIcon
} from '@heroicons/vue/24/outline'
import { useRouter } from 'vue-router'
import ndcLogo from '@/assets/ndc_logo.png'

const auth = useAuthStore()
const store = useLibraryStore()
const router = useRouter()
const route = useRoute()
const { isDark, toggleTheme } = useTheme()

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
    { to: '/dashboard/faculty-requests', name: 'FacultyRequests', label: 'My Requests', icon: DocumentTextIcon, roles: ['faculty'] },
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
  <div class="flex h-screen bg-slate-100 dark:bg-[#0F172A] overflow-hidden relative print:h-auto print:overflow-visible print:bg-white transition-colors duration-200">
    
    <!-- Mobile Sidebar Overlay -->
    <div 
      v-if="isMobileSidebarOpen"
      class="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity print:hidden"
      @click="closeMobileSidebar"
    ></div>

    <!-- Sidebar -->
    <aside 
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 bg-[#f4f7f6] dark:bg-[#1E293B] border-r border-slate-200 dark:border-slate-700/60 flex flex-col flex-shrink-0 transform transition-transform duration-300 md:relative md:translate-x-0 print:hidden',
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-700/60">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-200/50 dark:bg-slate-800">
            <img :src="ndcLogo" class="w-full h-full object-contain p-0.5" alt="NDC Logo" />
          </div>
          <div>
            <p class="text-slate-800 dark:text-slate-100 font-bold text-base leading-none">Lumina</p>
            <p class="text-slate-500 dark:text-slate-400 text-[10px] font-medium">Library System</p>
          </div>
        </div>
        <!-- Close button on mobile -->
        <button @click="closeMobileSidebar" class="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- User info -->
      <div class="px-4 py-4 border-b border-slate-200 dark:border-slate-700/60">
        <p class="text-slate-800 dark:text-slate-100 font-semibold text-sm">{{ auth.user?.firstName }} {{ auth.user?.lastName }}</p>
        <p class="text-slate-500 dark:text-slate-400 text-xs capitalize">{{ auth.user?.role }}</p>
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
      <button @click="logout" class="flex items-center gap-3 px-5 py-4 text-slate-500 dark:text-slate-400 hover:text-[#6B131D] dark:hover:text-rose-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all text-sm border-t border-slate-200 dark:border-slate-700/60 mt-auto cursor-pointer">
        <ArrowRightOnRectangleIcon class="w-5 h-5" />
        Sign Out
      </button>
    </aside>

    <!-- Main content area -->
    <div class="flex-1 overflow-y-auto flex flex-col min-w-0 print:overflow-visible">
      <!-- Top bar -->
      <header class="h-16 bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 flex-shrink-0 print:hidden transition-colors">
        <div class="flex items-center gap-3">
          <!-- Hamburger menu button -->
          <button @click="isMobileSidebarOpen = true" class="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 -ml-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
            <Bars3Icon class="w-6 h-6" />
          </button>
          <h1 class="text-lg font-semibold text-slate-800 dark:text-slate-100 capitalize truncate max-w-[150px] sm:max-w-none">
            {{ route.name?.toString().replace(/([A-Z])/g, ' $1').trim() }}
          </h1>
        </div>
        
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Theme Toggle Button -->
          <button
            @click="toggleTheme"
            class="p-2 rounded-full text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
            :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            aria-label="Toggle Theme"
          >
            <SunIcon v-if="isDark" class="w-5 h-5 text-amber-400 transition-transform duration-300 hover:rotate-45" />
            <MoonIcon v-else class="w-5 h-5 transition-transform duration-300 hover:-rotate-12" />
          </button>

          <RouterLink to="/opac" class="btn-ghost text-sm flex-shrink-0">
            <BookOpenIcon class="w-4 h-4" />
            <span class="hidden sm:inline">View OPAC</span>
            <span class="sm:hidden">OPAC</span>
          </RouterLink>
        </div>
      </header>

      <main class="p-4 sm:p-6 flex-1 print:p-0 print:overflow-visible">
        <RouterView />
      </main>
    </div>
  </div>
</template>
