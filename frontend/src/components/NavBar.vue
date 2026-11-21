<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/useLibraryStore'
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
  XMarkIcon,
  ArrowRightIcon,
  HomeIcon,
  ArrowsRightLeftIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  DocumentMagnifyingGlassIcon,
} from '@heroicons/vue/24/outline'
import ndcLogo from '@/assets/ndc_logo.png'

const auth = useAuthStore()
const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const isMobileMenuOpen = ref(false)

// Sidebar visibility computed from auth store
const isSidebarVisible = computed(() => auth.isSidebarVisible)

function logout() {
  auth.logout()
  isMobileMenuOpen.value = false
  router.push('/login')
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

function toggleSidebar() {
  auth.toggleSidebar()
}

// Dashboard navigation items for librarian/admin
const dashboardNavItems = computed(() => {
  const role = auth.user?.role || ''
  return [
    { to: '/dashboard', name: 'DashboardHome', label: 'Dashboard', icon: HomeIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/circulation', name: 'Circulation', label: 'Circulation', icon: ArrowsRightLeftIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/history', name: 'TransactionHistory', label: 'Transaction History', icon: DocumentTextIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/attendance', name: 'Attendance', label: 'Attendance', icon: ClipboardDocumentListIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/books', name: 'ManageBooks', label: 'Manage Items', icon: BookOpenIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/users', name: 'ManageUsers', label: 'Manage Users', icon: UserGroupIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/librarians', name: 'ManageLibrarians', label: 'Manage Librarians', icon: UserGroupIcon, roles: ['admin', 'chief_librarian'] },
    { to: '/dashboard/book-requests', name: 'ManageBookRequests', label: 'Book Requests', icon: DocumentTextIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/reports', name: 'ReportsView', label: 'Reports', icon: ChartBarIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
    { to: '/dashboard/activity-log', name: 'ActivityLog', label: 'Activity Log', icon: DocumentMagnifyingGlassIcon, roles: ['librarian', 'chief_librarian', 'admin'] },
  ].filter(item => item.roles.includes(role))
})

// Standard nav items for non-librarian (student/faculty)
const standardNavItems = computed(() => [
  { to: '/opac', name: 'Opac', label: 'Catalog', icon: BookOpenIcon, roles: ['student', 'faculty', 'guest'] },
  { to: '/profile', name: 'Profile', label: 'Profile', icon: UserCircleIcon, roles: ['student', 'faculty', 'guest'] },
  { to: '/dashboard/faculty-requests', name: 'FacultyRequests', label: 'My Requests', icon: DocumentTextIcon, roles: ['faculty'] },
])

// Filtered nav items based on current user role
const filteredStandardNavItems = computed(() => {
  const role = auth.user?.role || 'guest'
  return standardNavItems.value.filter(item => item.roles.includes(role))
})
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
    <!-- Guest sidebar toggle in mobile header -->
    <button
      v-if="!auth.isAuthenticated"
      @click="toggleSidebar"
      class="ml-auto p-2 rounded-md text-white/90 hover:bg-white/10"
      :aria-label="auth.sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'"
    >
      <ChevronLeftIcon v-if="!auth.sidebarCollapsed" class="w-6 h-6" />
      <ChevronRightIcon v-else class="w-6 h-6" />
    </button>
  </header>

  <div
    v-if="isMobileMenuOpen"
    class="fixed inset-0 z-40 bg-slate-950/50 md:hidden print:hidden"
    @click="closeMobileMenu"
  ></div>

  <aside
    v-if="isSidebarVisible"
    :class="[
      'fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#6B131D] dark:bg-[#4A0D14] text-white shadow-xl transition-all duration-300 print:hidden',
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
      <!-- Guest sidebar toggle in sidebar header (desktop) -->
      <button
        v-if="!auth.isAuthenticated"
        @click="toggleSidebar"
        class="ml-auto p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors md:block hidden"
        :aria-label="auth.sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'"
      >
        <ChevronLeftIcon v-if="!auth.sidebarCollapsed" class="w-5 h-5" />
        <ChevronRightIcon v-else class="w-5 h-5" />
      </button>
    </div>

    <div v-if="auth.isAuthenticated" class="px-5 py-4 border-b border-white/10">
      <p class="font-semibold text-sm truncate">{{ auth.user?.firstName }} {{ auth.user?.lastName }}</p>
      <p class="text-white/60 text-xs capitalize">{{ auth.user?.role }}</p>
    </div>

    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <!-- Dashboard nav for librarian/admin (Dashboard FIRST) -->
      <template v-if="auth.isLibrarian">
        <template v-for="(item, index) in dashboardNavItems" :key="item.to">
          <router-link
            :to="item.to"
            @click="closeMobileMenu"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            :class="{ '!text-white !bg-white/20 !font-semibold': $route.name === item.name }"
          >
            <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
            {{ item.label }}
          </router-link>

          <!-- View OPAC link for librarian/admin (right after Dashboard, index 0) -->
          <router-link
            v-if="index === 0"
            to="/opac"
            @click="closeMobileMenu"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            :class="{ '!text-white !bg-white/20 !font-semibold': $route.name === 'Opac' }"
          >
            <BookOpenIcon class="w-5 h-5 flex-shrink-0" />
            View OPAC
          </router-link>
        </template>
      </template>

      <!-- Standard nav for student/faculty -->
      <template v-else>
        <router-link
          v-for="item in filteredStandardNavItems"
          :key="item.to"
          :to="item.to"
          @click="closeMobileMenu"
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          :class="{ '!text-white !bg-white/20 !font-semibold': $route.name === item.name }"
        >
          <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
          {{ item.label }}
        </router-link>
      </template>
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

  <!-- Floating "Show Sidebar" button for guests when sidebar is collapsed (desktop only) -->
  <button
    v-if="!auth.isAuthenticated && auth.sidebarCollapsed"
    @click="toggleSidebar"
    class="fixed left-4 top-1/2 -translate-y-1/2 z-40 md:block hidden p-2 rounded-full bg-[#6B131D] dark:bg-[#4A0D14] text-white shadow-xl hover:bg-[#8B1A28] transition-all duration-200 hover:scale-105"
    :aria-label="auth.sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'"
    title="Show navigation"
  >
    <ArrowRightIcon class="w-6 h-6" />
  </button>
</template>