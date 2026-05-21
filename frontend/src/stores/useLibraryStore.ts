import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: 'student' | 'faculty' | 'librarian' | 'admin'
  institutionalId: string
  eligibilityStatus: 'eligible' | 'suspended' | 'expelled'
  profilePhotoUrl: string | null
  barcode: string
  gender?: 'Male' | 'Female' | 'Other'
  department?: { id: number; name: string; code: string }
}

export interface Book {
  id: number
  isbn: string
  callNumber: string
  title: string
  edition: string | null
  publisher: string | null
  publishYear: number | null
  category: { id: number; name: string } | null
  language: string
  description: string | null
  coverImageUrl: string | null
  totalCopies: number
  availableCopies: number
  locationShelf: string | null
  isReferenceOnly: boolean
  authors: string[]
  copies?: { id: number, barcode: string, condition: string, isActive: boolean }[]
}

export interface Transaction {
  id: number
  bookCopy: {
    id: number
    barcode: string
    book: Book
  }
  transactionType: 'checkout' | 'return' | 'renewal' | 'lost'
  checkoutDate: string
  dueDate: string
  returnDate: string | null
  renewalCount: number
  overdueDays: number
  fineAmount: number
  finePaid: boolean
  status: 'active' | 'returned' | 'overdue' | 'lost'
}

export interface BookRequestItem {
  id: number
  book: Book | null
  title: string | null
  author: string | null
  isbn: string | null
  publisher: string | null
  requestType: 'borrow' | 'acquisition'
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled'
  librarian: { firstName: string; lastName: string } | null
  librarianNotes: string | null
  processedAt: string | null
  createdAt: string
  user?: { id: number; firstName: string; lastName: string; institutionalId: string; department?: { name: string } }
}

export interface PaginatedBooks {
  data: Book[]
  total: number
  page: number
  lastPage: number
}

function formatApiMessage(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: unknown } } }).response?.data?.message
  if (Array.isArray(msg)) return msg.map(String).join(' ')
  if (typeof msg === 'string') return msg
  return fallback
}

export interface RegisterPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  institutionalId: string
  role: 'student' | 'faculty' | 'librarian'
  gender?: string
  departmentId?: number
}

// ─── AUTH STORE ───────────────────────────────────────────────────────────────
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('lumina_token'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isStudent = computed(() => user.value?.role === 'student')
  const isFaculty = computed(() => user.value?.role === 'faculty')
  const isLibrarian = computed(() => ['librarian', 'admin'].includes(user.value?.role ?? ''))
  const isSuspended = computed(() => user.value?.eligibilityStatus === 'suspended')

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/auth/login', { email, password })
      token.value = data.access_token
      user.value = data.user
      localStorage.setItem('lumina_token', data.access_token)
    } catch (e: unknown) {
      error.value = formatApiMessage(e, 'Login failed')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function register(payload: RegisterPayload): Promise<string> {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post<{ message: string; email: string }>(
        '/auth/register',
        payload,
      )
      return data.message
    } catch (e: unknown) {
      error.value = formatApiMessage(e, 'Registration failed')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const { data } = await api.get('/auth/me')
      user.value = data
    } catch {
      logout()
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('lumina_token')
  }

  async function updateProfile(payload: { firstName?: string, lastName?: string, middleName?: string, gender?: string, profilePhotoUrl?: string }) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.patch('/users/me/profile', payload)
      user.value = data
      return data
    } catch (e: unknown) {
      error.value = formatApiMessage(e, 'Failed to update profile')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function changePassword(payload: any) {
    loading.value = true
    error.value = null
    try {
      await api.patch('/users/me/password', payload)
    } catch (e: unknown) {
      error.value = formatApiMessage(e, 'Failed to change password')
      throw e
    } finally {
      loading.value = false
    }
  }

  return { user, token, loading, error, isAuthenticated, isStudent, isFaculty, isLibrarian, isSuspended, login, register, logout, fetchMe, updateProfile, changePassword }
})

// ─── LIBRARY STORE ────────────────────────────────────────────────────────────
export const useLibraryStore = defineStore('library', () => {
  // State
  const books = ref<Book[]>([])
  const currentBook = ref<Book | null>(null)
  const categories = ref<{ id: number; name: string }[]>([])
  const totalBooks = ref(0)
  const currentPage = ref(1)
  const lastPage = ref(1)
  const loading = ref(false)
  const searchQuery = ref('')
  const selectedCategory = ref<number | null>(null)
  const availableOnly = ref(false)
  const excludeReference = ref(false)
  const publishYearStart = ref<number | null>(null)
  const publishYearEnd = ref<number | null>(null)

  // My borrowings (for student view)
  const myTransactions = ref<Transaction[]>([])
  const myActiveTransactions = ref<Transaction[]>([])
  const loadingTransactions = ref(false)

  // Book requests (faculty feature)
  const myBookRequests = ref<BookRequestItem[]>([])
  const allBookRequests = ref<BookRequestItem[]>([])
  const loadingBookRequests = ref(false)
  const pendingRequestCount = ref(0)

  // Dashboard stats
  const stats = ref({ totalBooks: 0, totalCopies: 0, availableCopies: 0 })
  const txStats = ref({ active: 0, overdue: 0, returnedToday: 0 })

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function searchBooks(page = 1) {
    loading.value = true
    try {
      const params: Record<string, any> = {
        page,
        limit: 12,
      }
      if (searchQuery.value) params.q = searchQuery.value
      if (selectedCategory.value) params.categoryId = selectedCategory.value
      if (availableOnly.value) params.availableOnly = true
      if (excludeReference.value) params.excludeReference = true
      if (publishYearStart.value) params.publishYearStart = publishYearStart.value
      if (publishYearEnd.value) params.publishYearEnd = publishYearEnd.value

      const { data } = await api.get<PaginatedBooks>('/books/search', { params })
      books.value = data.data
      totalBooks.value = data.total
      currentPage.value = data.page
      lastPage.value = data.lastPage
    } finally {
      loading.value = false
    }
  }

  async function fetchBook(id: number) {
    loading.value = true
    try {
      const { data } = await api.get<Book>(`/books/${id}`)
      currentBook.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchCategories() {
    const { data } = await api.get('/books/categories')
    categories.value = data
  }

  async function fetchMyTransactions() {
    loadingTransactions.value = true
    try {
      const [history, active] = await Promise.all([
        api.get<Transaction[]>('/transactions/my'),
        api.get<Transaction[]>('/transactions/my/active'),
      ])
      myTransactions.value = history.data
      myActiveTransactions.value = active.data
    } finally {
      loadingTransactions.value = false
    }
  }

  async function renewBook(transactionId: number) {
    const { data } = await api.post('/transactions/renew', { transactionId })
    // Update in active list
    const idx = myActiveTransactions.value.findIndex((t) => t.id === transactionId)
    if (idx !== -1) myActiveTransactions.value[idx] = data
    return data
  }

  async function reserveBook(bookId: number) {
    const { data } = await api.post(`/reservations/book/${bookId}`)
    return data
  }

  // ── Book Request Actions (Faculty) ────────────────────────────────────────
  async function requestBorrowBook(bookId: number, reason?: string) {
    const { data } = await api.post('/book-requests/borrow', { bookId, reason })
    await fetchMyBookRequests()
    return data
  }

  async function requestAcquisition(payload: { title: string; author?: string; isbn?: string; publisher?: string; reason: string }) {
    const { data } = await api.post('/book-requests/acquisition', payload)
    await fetchMyBookRequests()
    return data
  }

  async function fetchMyBookRequests() {
    loadingBookRequests.value = true
    try {
      const { data } = await api.get<BookRequestItem[]>('/book-requests/my')
      myBookRequests.value = data
    } finally {
      loadingBookRequests.value = false
    }
  }

  async function fetchAllBookRequests() {
    loadingBookRequests.value = true
    try {
      const { data } = await api.get<BookRequestItem[]>('/book-requests')
      allBookRequests.value = data
    } finally {
      loadingBookRequests.value = false
    }
  }

  async function fetchPendingRequestCount() {
    const { data } = await api.get<number>('/book-requests/pending-count')
    pendingRequestCount.value = data
  }

  async function updateBookRequestStatus(requestId: number, status: string, librarianNotes?: string) {
    const { data } = await api.patch(`/book-requests/${requestId}/status`, { status, librarianNotes })
    await fetchAllBookRequests()
    return data
  }

  async function fetchStats() {
    const [bookStats, transStats] = await Promise.all([
      api.get('/books/stats/overview'),
      api.get('/transactions/stats'),
    ])
    stats.value = bookStats.data
    txStats.value = transStats.data
  }

  function resetSearch() {
    searchQuery.value = ''
    selectedCategory.value = null
    availableOnly.value = false
    excludeReference.value = false
    publishYearStart.value = null
    publishYearEnd.value = null
    currentPage.value = 1
  }

  // Computed helpers
  const hasOverdue = computed(() =>
    myActiveTransactions.value.some((t) => t.status === 'overdue')
  )
  const overdueCount = computed(() =>
    myActiveTransactions.value.filter((t) => t.status === 'overdue').length
  )
  const totalFinesDue = computed(() =>
    myActiveTransactions.value
      .filter((t) => !t.finePaid)
      .reduce((sum, t) => sum + Number(t.fineAmount), 0)
  )

  return {
    books, currentBook, categories, totalBooks, currentPage, lastPage,
    loading, searchQuery, selectedCategory, availableOnly, excludeReference,
    publishYearStart, publishYearEnd,
    myTransactions, myActiveTransactions, loadingTransactions,
    myBookRequests, allBookRequests, loadingBookRequests, pendingRequestCount,
    stats, txStats,
    hasOverdue, overdueCount, totalFinesDue,
    searchBooks, fetchBook, fetchCategories, fetchMyTransactions, renewBook, reserveBook,
    requestBorrowBook, requestAcquisition, fetchMyBookRequests, fetchAllBookRequests, fetchPendingRequestCount, updateBookRequestStatus,
    fetchStats, resetSearch,
  }
})
