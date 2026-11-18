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
  <div class="flex h-screen bg-[#F7F5F0] dark:bg-[#0F172A] overflow-hidden relative print:h-auto print:overflow-visible print:bg-white transition-colors duration-200">
    
    <!-- Mobile Sidebar Overlay -->
    <div 
      v-if="isMobileSidebarOpen"
      class="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity print:hidden"
      @click="closeMobileSidebar"
    ></div>

    <!-- Sidebar -->
    <aside 
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 bg-[#6B131D] dark:bg-[#4A0D14] border-r border-white/10 flex flex-col flex-shrink-0 transform transition-transform duration-300 md:relative md:translate-x-0 print:hidden',
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center justify-between px-5 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
            <img :src="ndcLogo" class="w-full h-full object-contain p-0.5" alt="NDC Logo" />
          </div>
          <div>
            <p class="text-white font-bold text-base leading-none">Lumina</p>
            <p class="text-white/60 text-[10px] font-medium">Library System</p>
          </div>
        </div>
        <!-- Close button on mobile -->
        <button @click="closeMobileSidebar" class="md:hidden text-white/80 hover:text-white p-1">
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- User info -->
      <div class="px-4 py-4 border-b border-white/10">
        <p class="text-white font-semibold text-sm">{{ auth.user?.firstName }} {{ auth.user?.lastName }}</p>
        <p class="text-white/60 text-xs capitalize">{{ auth.user?.role }}</p>
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

      <!-- Sidebar actions -->
      <div class="px-3 py-3 space-y-1 border-t border-white/10">
        <RouterLink to="/opac" class="nav-link" @click="closeMobileSidebar">
          <BookOpenIcon class="w-5 h-5 flex-shrink-0" />
          View OPAC
        </RouterLink>
        <button
          @click="toggleTheme"
          class="nav-link w-full cursor-pointer"
          :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          aria-label="Toggle Theme"
        >
          <SunIcon v-if="isDark" class="w-5 h-5 flex-shrink-0 text-amber-400" />
          <MoonIcon v-else class="w-5 h-5 flex-shrink-0" />
          {{ isDark ? 'Light Mode' : 'Dark Mode' }}
        </button>
      </div>

      <!-- Logout -->
      <button @click="logout" class="flex items-center gap-3 px-5 py-4 text-white/80 hover:text-white hover:bg-white/10 transition-all text-sm border-t border-white/10 mt-auto cursor-pointer">
        <ArrowRightOnRectangleIcon class="w-5 h-5" />
        Sign Out
      </button>
    </aside>

    <!-- Main content area -->
    <div class="flex-1 overflow-y-auto flex flex-col min-w-0 print:overflow-visible">
      <!-- Mobile control for opening the sidebar -->
      <header class="h-16 bg-[#6B131D] dark:bg-[#4A0D14] border-b border-white/10 flex items-center px-4 sticky top-0 z-30 flex-shrink-0 md:hidden print:hidden transition-colors">
        <button @click="isMobileSidebarOpen = true" class="text-white/80 hover:text-white p-1 -ml-2 rounded-md hover:bg-white/10" aria-label="Open sidebar">
          <Bars3Icon class="w-6 h-6" />
        </button>
        <h1 class="ml-3 text-lg font-semibold text-white capitalize truncate">
          {{ route.name?.toString().replace(/([A-Z])/g, ' $1').trim() }}
        </h1>
      </header>

      <main class="p-4 sm:p-6 flex-1 print:p-0 print:overflow-visible">
        <RouterView />
      </main>
    </div>
  </div>
</template>
