import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/useLibraryStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/opac',
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/signup',
      name: 'SignUp',
      component: () => import('@/views/SignUpView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/opac',
      name: 'Opac',
      component: () => import('@/views/StudentOpacView.vue'),
    },
    {
      path: '/opac/book/:id',
      name: 'BookDetail',
      component: () => import('@/views/BookDetailView.vue'),
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('@/views/StudentProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/faculty/requests',
      name: 'FacultyRequests',
      component: () => import('@/views/FacultyBookRequestsView.vue'),
      meta: { requiresAuth: true, roles: ['faculty'] },
    },
    // Librarian / Admin dashboard routes
    {
      path: '/dashboard',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true, roles: ['librarian', 'chief_librarian', 'admin'] },
      children: [
        {
          path: '',
          name: 'DashboardHome',
          component: () => import('@/views/dashboard/DashboardHomeView.vue'),
        },
        {
          path: 'circulation',
          name: 'Circulation',
          component: () => import('@/views/dashboard/CirculationView.vue'),
        },
        {
          path: 'history',
          name: 'TransactionHistory',
          component: () => import('@/views/dashboard/TransactionHistoryView.vue'),
          meta: { roles: ['librarian', 'chief_librarian'] },
        },
        {
          path: 'attendance',
          name: 'Attendance',
          component: () => import('@/views/dashboard/AttendanceView.vue'),
        },
        {
          path: 'books',
          name: 'ManageBooks',
          component: () => import('@/views/dashboard/BookManagementView.vue'),
        },
        {
          path: 'users',
          name: 'ManageUsers',
          component: () => import('@/views/dashboard/UserManagementView.vue'),
        },
        {
          path: 'book-requests',
          name: 'ManageBookRequests',
          component: () => import('@/views/dashboard/BookRequestsManagementView.vue'),
        },
        {
          path: 'librarians',
          name: 'ManageLibrarians',
          component: () => import('@/views/dashboard/LibrarianManagementView.vue'),
          meta: { roles: ['admin', 'chief_librarian'] },
        },
        {
          path: 'reports',
          name: 'ReportsView',
          component: () => import('@/views/dashboard/ReportsView.vue'),
          meta: { roles: ['librarian', 'chief_librarian', 'admin'] },
        },
      ],
    },
    {
      path: '/kiosk/attendance',
      name: 'KioskAttendance',
      component: () => import('@/views/KioskAttendanceView.vue'),
      meta: { requiresAuth: true, roles: ['librarian', 'chief_librarian'] },
    },
    { path: '/:pathMatch(.*)*', redirect: '/opac' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Initialize user if token exists
  if (auth.token && !auth.user) {
    await auth.fetchMe()
  }

  if (to.meta.requiresGuest && auth.isAuthenticated) {
    return { name: 'Opac' }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (to.meta.roles && auth.user) {
    if (!(to.meta.roles as string[]).includes(auth.user.role)) {
      return { name: 'Opac' }
    }
  }
})

export default router
