<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { format, parseISO, differenceInDays } from 'date-fns'
import { useLibraryStore, useAuthStore, type BookRequestItem } from '@/stores/useLibraryStore'
import {
  BookOpenIcon, PlusIcon, XMarkIcon, ClockIcon,
  CheckCircleIcon, XCircleIcon, PaperAirplaneIcon,
  DocumentTextIcon, AcademicCapIcon, FunnelIcon, EyeIcon,
  ArrowPathIcon, ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import Pagination from '@/components/Pagination.vue'

const store = useLibraryStore()
const auth = useAuthStore()

// Tab state
const activeTab = ref<'my-requests' | 'new-acquisition' | 'borrowing-history'>('my-requests')

// Status Filter for My Requests
const filterStatus = ref<string>('all')
const currentLimit = ref(10)

// Request Detail Modal
const detailModalRequest = ref<BookRequestItem | null>(null)

// Acquisition Form Item Types
const itemTypes = ['BOOKS', 'Journals', 'Thesis', 'CD', 'DVD', 'Cartographic Materials', 'Electronics']

const blankAcqForm = () => ({
  itemType: 'BOOKS',
  title: '',
  otherTitle: '',
  author: '',
  isbn: '',
  issn: '',
  callNumber: '',
  categoryId: '',
  publisher: '',
  publishYear: new Date().getFullYear(),
  edition: '',
  language: 'English',
  locationShelf: '',
  description: '',
  reason: '',
})

const acqForm = ref(blankAcqForm())
const acqLoading = ref(false)
const acqError = ref('')
const acqSuccess = ref(false)

// Borrowing History Filter
const historyFilter = ref<'all' | 'returned' | 'currently_borrowed'>('all')

const typeConfig = computed(() => {
  const type = acqForm.value.itemType
  const base = {
    titleLabel: 'Main Title *',
    showOtherTitle: true,
    otherTitleLabel: 'Other Title / Subtitle',
    isbnLabel: 'ISBN *',
    showIssn: true,
    issnLabel: 'ISSN',
    callNumberLabel: 'Call Number',
    showCategory: true,
    showLanguage: true,
    showPublisher: true,
    publisherLabel: 'Publisher',
    showPublishYear: true,
    publishYearLabel: 'Publish Year',
    showEdition: true,
    editionLabel: 'Edition',
    showAuthors: true,
    authorsLabel: 'Author(s) / Contributor(s)',
  }

  switch (type) {
    case 'Journals':
      return { ...base, titleLabel: 'Journal Name *', editionLabel: 'Issue / Volume', isbnLabel: 'ISSN / Ref No. *', showIssn: false, showOtherTitle: false, authorsLabel: 'Authors / Contributors' }
    case 'Thesis':
      return { ...base, titleLabel: 'Thesis Title *', otherTitleLabel: 'Degree Program', isbnLabel: 'Thesis ID / Ref No. *', showIssn: false, publisherLabel: 'University / Department', publishYearLabel: 'Submission Year', showEdition: false, authorsLabel: 'Author(s)' }
    case 'CD':
    case 'DVD':
      return { ...base, titleLabel: 'Title *', editionLabel: 'Format / Duration', isbnLabel: 'UPC / EAN *', showIssn: false, publisherLabel: 'Studio / Producer', publishYearLabel: 'Release Year', authorsLabel: 'Artist / Director' }
    case 'Cartographic Materials':
      return { ...base, titleLabel: 'Title / Region *', editionLabel: 'Scale', isbnLabel: 'Identifier *', showIssn: false, authorsLabel: 'Cartographer(s)' }
    case 'Electronics':
      return { ...base, titleLabel: 'Item Name *', otherTitleLabel: 'Model / Specs', isbnLabel: 'Serial Number *', callNumberLabel: 'Control Number', showIssn: false, publisherLabel: 'Brand / Manufacturer', publishYearLabel: 'Acquisition Year', showCategory: false, showLanguage: false, showEdition: false, showAuthors: false }
    default:
      return base
  }
})

onMounted(() => {
  fetchRequests(1)
  store.fetchCategories()
  store.fetchMyTransactions()
})

function fetchRequests(page = 1) {
  const statusParam = filterStatus.value === 'all' ? undefined : filterStatus.value
  store.fetchMyBookRequests(page, currentLimit.value, statusParam)
}

function setStatusFilter(status: string) {
  filterStatus.value = status
  fetchRequests(1)
}

function onLimitChange(newLimit: number) {
  currentLimit.value = newLimit
  fetchRequests(1)
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return 'N/A'
  try { return format(parseISO(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}

function daysUntilDue(dueDate: string) {
  const due = parseISO(dueDate)
  return differenceInDays(due, new Date())
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    rejected: 'bg-rose-100 text-rose-700 border border-rose-200',
    fulfilled: 'bg-sky-100 text-sky-700 border border-sky-200',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}

function txStatusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-sky-100 text-sky-700 border border-sky-200',
    overdue: 'bg-rose-100 text-rose-700 border border-rose-200',
    returned: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    lost: 'bg-rose-100 text-rose-700 border border-rose-200',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}

async function handleRenew(txId: number) {
  try {
    await store.renewBook(txId)
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Renewal failed')
  }
}

// Borrowing History Calculations
const historyCounts = computed(() => {
  const all = store.myTransactions.length
  const returned = store.myTransactions.filter(t => t.status === 'returned').length
  const currentlyBorrowed = store.myTransactions.filter(t => t.status === 'active' || t.status === 'overdue').length
  return { all, returned, currentlyBorrowed }
})

const filteredHistory = computed(() => {
  if (historyFilter.value === 'returned') {
    return store.myTransactions.filter(t => t.status === 'returned')
  }
  if (historyFilter.value === 'currently_borrowed') {
    return store.myTransactions.filter(t => t.status === 'active' || t.status === 'overdue')
  }
  return store.myTransactions
})

async function submitAcquisition() {
  acqLoading.value = true
  acqError.value = ''
  acqSuccess.value = false
  try {
    await store.requestAcquisition({
      itemType: acqForm.value.itemType,
      title: acqForm.value.title,
      otherTitle: acqForm.value.otherTitle || undefined,
      author: acqForm.value.author || undefined,
      isbn: acqForm.value.isbn || undefined,
      issn: acqForm.value.issn || undefined,
      callNumber: acqForm.value.callNumber || undefined,
      categoryId: acqForm.value.categoryId ? Number(acqForm.value.categoryId) : undefined,
      publisher: acqForm.value.publisher || undefined,
      publishYear: acqForm.value.publishYear ? Number(acqForm.value.publishYear) : undefined,
      edition: acqForm.value.edition || undefined,
      language: acqForm.value.language || 'English',
      locationShelf: acqForm.value.locationShelf || undefined,
      description: acqForm.value.description || undefined,
      reason: acqForm.value.reason,
    })
    acqSuccess.value = true
    acqForm.value = blankAcqForm()
    setTimeout(() => { activeTab.value = 'my-requests' }, 1500)
  } catch (e: any) {
    acqError.value = e.response?.data?.message ?? 'Request failed'
  } finally {
    acqLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto w-full">
    <!-- Header -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-slate-800">Faculty Portal</h2>
        <p class="text-slate-500 text-sm mt-0.5">Manage book requests, suggest acquisitions, and track borrowing history</p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex flex-wrap gap-1.5 p-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-2xl mb-6 w-fit border border-slate-300/40 dark:border-slate-700/60">
      <button
        @click="activeTab = 'my-requests'"
        :class="[
          'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer',
          activeTab === 'my-requests'
            ? 'bg-white dark:bg-[#6B131D] text-slate-800 dark:text-white shadow-sm font-bold'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <span class="flex items-center gap-2">
          <ClockIcon class="w-4 h-4 text-[#6B131D] dark:text-rose-400" />
          My Requests
        </span>
      </button>
      <button
        @click="activeTab = 'new-acquisition'"
        :class="[
          'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer',
          activeTab === 'new-acquisition'
            ? 'bg-white dark:bg-[#6B131D] text-slate-800 dark:text-white shadow-sm font-bold'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <span class="flex items-center gap-2">
          <PlusIcon class="w-4 h-4 text-purple-600 dark:text-purple-400" />
          Request New Book
        </span>
      </button>
      <button
        @click="activeTab = 'borrowing-history'"
        :class="[
          'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer',
          activeTab === 'borrowing-history'
            ? 'bg-white dark:bg-[#6B131D] text-slate-800 dark:text-white shadow-sm font-bold'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <span class="flex items-center gap-2">
          <BookOpenIcon class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Borrowing History
        </span>
      </button>
    </div>

    <!-- TAB 1: MY REQUESTS -->
    <div v-if="activeTab === 'my-requests'" class="space-y-4">
      <!-- Status Filter Bar -->
      <div class="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
          <FunnelIcon class="w-4 h-4 text-[#6B131D] dark:text-rose-400" />
          <span>Filter Status:</span>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <button
            @click="setStatusFilter('all')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
              filterStatus === 'all'
                ? 'bg-[#6B131D] dark:bg-[#6B131D] text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
          >
            All Statuses
          </button>
          <button
            @click="setStatusFilter('pending')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1',
              filterStatus === 'pending'
                ? 'bg-amber-500 text-white font-semibold shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100'
            ]"
          >
            <ClockIcon class="w-3.5 h-3.5" />
            Pending
          </button>
          <button
            @click="setStatusFilter('fulfilled')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1',
              filterStatus === 'fulfilled'
                ? 'bg-sky-600 text-white font-semibold shadow-xs'
                : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 hover:bg-sky-100'
            ]"
          >
            <CheckCircleIcon class="w-3.5 h-3.5" />
            Fulfilled
          </button>
          <button
            @click="setStatusFilter('approved')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1',
              filterStatus === 'approved'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
            ]"
          >
            <CheckCircleIcon class="w-3.5 h-3.5" />
            Approved
          </button>
          <button
            @click="setStatusFilter('rejected')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1',
              filterStatus === 'rejected'
                ? 'bg-rose-600 text-white font-semibold shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100'
            ]"
          >
            <XCircleIcon class="w-3.5 h-3.5" />
            Rejected
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="store.loadingBookRequests" class="space-y-3">
        <div v-for="i in 3" :key="i" class="card p-5">
          <div class="skeleton h-5 w-1/2 mb-2" />
          <div class="skeleton h-4 w-1/3 mb-2" />
          <div class="skeleton h-3 w-3/4" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="store.myBookRequests.length === 0" class="card py-16 text-center">
        <DocumentTextIcon class="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <p class="text-lg font-semibold text-slate-600">No {{ filterStatus !== 'all' ? filterStatus : '' }} requests found</p>
        <p class="text-sm text-slate-400 mt-1">
          Browse the <router-link to="/opac" class="text-[#447794] hover:underline font-medium">catalog</router-link>
          to request a book, or suggest a new acquisition.
        </p>
      </div>

      <!-- Request List Table -->
      <div v-else class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-50 border-b border-slate-100">
              <tr>
                <th class="table-header px-4 py-3 text-left">Type</th>
                <th class="table-header px-4 py-3 text-left">Title / Details</th>
                <th class="table-header px-4 py-3 text-left">Reason / Justification</th>
                <th class="table-header px-4 py-3 text-left">Date</th>
                <th class="table-header px-4 py-3 text-left">Status</th>
                <th class="table-header px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="req in store.myBookRequests"
                :key="req.id"
                class="table-row hover:bg-slate-50/60"
              >
                <td class="table-cell px-4">
                  <span :class="[
                    'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                    req.requestType === 'borrow' ? 'bg-[#447794]/10 text-[#447794]' : 'bg-purple-100 text-purple-700'
                  ]">
                    {{ req.requestType }}
                  </span>
                </td>
                <td class="table-cell px-4 max-w-[250px]">
                  <p class="font-medium text-slate-800 truncate">
                    {{ req.requestType === 'borrow' ? req.book?.title : req.title }}
                  </p>
                  <p v-if="req.requestType === 'acquisition' && req.author" class="text-xs text-slate-500 truncate">
                    by {{ req.author }}
                  </p>
                  <p v-if="req.requestType === 'borrow' && req.book?.authors?.length" class="text-xs text-slate-500 truncate">
                    by {{ req.book.authors.join(', ') }}
                  </p>
                  <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                    <span v-if="req.itemType && req.itemType !== 'BOOKS'" class="px-1.5 py-0.2 rounded bg-slate-100 font-semibold text-slate-600">
                      {{ req.itemType }}
                    </span>
                    <span v-if="req.isbn">ISBN: {{ req.isbn }}</span>
                    <span v-if="req.category?.name" class="truncate">• {{ req.category.name }}</span>
                  </div>
                </td>
                <td class="table-cell px-4 max-w-[250px]">
                  <p v-if="req.reason" class="text-xs text-slate-600 italic truncate">"{{ req.reason }}"</p>
                  <p v-if="req.librarianNotes" class="text-xs text-emerald-600 font-medium truncate mt-0.5">Note: {{ req.librarianNotes }}</p>
                  <span v-if="!req.reason && !req.librarianNotes" class="text-xs text-slate-400">—</span>
                </td>
                <td class="table-cell px-4 text-xs text-slate-500 whitespace-nowrap">
                  {{ formatDate(req.createdAt) }}
                </td>
                <td class="table-cell px-4">
                  <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold capitalize', statusBadgeClass(req.status)]">
                    {{ req.status }}
                  </span>
                </td>
                <td class="table-cell px-4 text-center">
                  <button
                    @click="detailModalRequest = req"
                    class="p-1.5 text-slate-400 hover:text-[#447794] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="View Request Details"
                  >
                    <EyeIcon class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Pagination
          v-if="store.myBookRequestsTotal > 0"
          :current-page="store.myBookRequestsPage"
          :last-page="store.myBookRequestsLastPage"
          :total-items="store.myBookRequestsTotal"
          :limit="currentLimit"
          @update:page="fetchRequests"
          @update:limit="onLimitChange"
        />
      </div>
    </div>

    <!-- TAB 2: REQUEST NEW BOOK (ACQUISITION) -->
    <div v-if="activeTab === 'new-acquisition'" class="card p-6">
      <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <AcademicCapIcon class="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 class="font-semibold text-slate-800">Request New Book Acquisition</h2>
          <p class="text-xs text-slate-500">Suggest new learning resources or research titles for the library catalog</p>
        </div>
      </div>

      <form @submit.prevent="submitAcquisition" class="space-y-5">
        <!-- Item Type Selection -->
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Item Type *</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="t in itemTypes"
              :key="t"
              type="button"
              @click="acqForm.itemType = t"
              :class="[
                'px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer',
                acqForm.itemType === t
                  ? 'bg-purple-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              ]"
            >
              {{ t }}
            </button>
          </div>
        </div>

        <!-- Main Title & Subtitle -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {{ typeConfig.titleLabel }}
            </label>
            <input v-model="acqForm.title" type="text" required placeholder="Enter book or material title" class="input" />
          </div>

          <div v-if="typeConfig.showOtherTitle">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {{ typeConfig.otherTitleLabel }}
            </label>
            <input v-model="acqForm.otherTitle" type="text" placeholder="e.g. Subtitle or alternative title" class="input" />
          </div>
        </div>

        <!-- Author(s) & Identifiers -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-if="typeConfig.showAuthors">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {{ typeConfig.authorsLabel }}
            </label>
            <input v-model="acqForm.author" type="text" placeholder="e.g. John Doe, Jane Smith" class="input" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {{ typeConfig.isbnLabel }}
            </label>
            <input v-model="acqForm.isbn" type="text" placeholder="e.g. 978-3-16-148410-0" class="input font-mono" />
          </div>

          <div v-if="typeConfig.showIssn">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {{ typeConfig.issnLabel }}
            </label>
            <input v-model="acqForm.issn" type="text" placeholder="e.g. 2049-3630" class="input font-mono" />
          </div>
        </div>

        <!-- Call Number, Category, Language -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {{ typeConfig.callNumberLabel }}
            </label>
            <input v-model="acqForm.callNumber" type="text" placeholder="e.g. QA76.73 .P98 2024" class="input font-mono" />
          </div>

          <div v-if="typeConfig.showCategory">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
            <select v-model="acqForm.categoryId" class="input">
              <option value="">Select Category</option>
              <option v-for="cat in store.categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div v-if="typeConfig.showLanguage">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Language</label>
            <input v-model="acqForm.language" type="text" placeholder="e.g. English" class="input" />
          </div>
        </div>

        <!-- Publisher, Publish Year, Edition -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-if="typeConfig.showPublisher">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {{ typeConfig.publisherLabel }}
            </label>
            <input v-model="acqForm.publisher" type="text" placeholder="e.g. O'Reilly Media" class="input" />
          </div>

          <div v-if="typeConfig.showPublishYear">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {{ typeConfig.publishYearLabel }}
            </label>
            <input v-model.number="acqForm.publishYear" type="number" min="1800" :max="new Date().getFullYear() + 2" placeholder="e.g. 2024" class="input" />
          </div>

          <div v-if="typeConfig.showEdition">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {{ typeConfig.editionLabel }}
            </label>
            <input v-model="acqForm.edition" type="text" placeholder="e.g. 3rd Edition" class="input" />
          </div>
        </div>

        <!-- Description & Shelf Location -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description / Overview</label>
            <textarea v-model="acqForm.description" rows="2" placeholder="Brief description or course relevance" class="input resize-none" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Preferred Location / Shelf</label>
            <input v-model="acqForm.locationShelf" type="text" placeholder="e.g. Shelf A-3, Reserve Section" class="input" />
          </div>
        </div>

        <!-- Reason / Justification -->
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reason / Justification *</label>
          <textarea
            v-model="acqForm.reason"
            required
            rows="3"
            placeholder="Why should the library acquire this item? (e.g. Required course textbook for CS-401, research reference for faculty thesis)"
            class="input resize-none"
          />
        </div>

        <button type="submit" :disabled="acqLoading" class="btn-primary w-full justify-center py-3 text-sm">
          <PaperAirplaneIcon class="w-4 h-4" />
          {{ acqLoading ? 'Submitting Request...' : 'Submit Acquisition Request' }}
        </button>
      </form>

      <div v-if="acqError" class="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        {{ acqError }}
      </div>
      <div v-if="acqSuccess" class="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
        <p class="font-semibold text-emerald-700">✅ Request submitted successfully!</p>
        <p class="text-slate-600 mt-1">The library management team will review your book recommendation.</p>
      </div>
    </div>

    <!-- TAB 3: BORROWING HISTORY -->
    <div v-if="activeTab === 'borrowing-history'" class="card p-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <BookOpenIcon class="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 class="font-semibold text-slate-800">Faculty Borrowing History</h2>
            <p class="text-xs text-slate-500">Track active loans, due dates, and past returned books</p>
          </div>
        </div>

        <!-- History Filter Controls -->
        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            @click="historyFilter = 'all'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 sm:flex-none flex items-center justify-center gap-1.5 cursor-pointer',
              historyFilter === 'all'
                ? 'bg-white text-slate-800 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            ]"
          >
            All
            <span :class="['px-1.5 py-0.2 text-[10px] rounded-full', historyFilter === 'all' ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/60 text-slate-500']">
              {{ historyCounts.all }}
            </span>
          </button>

          <button
            @click="historyFilter = 'returned'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 sm:flex-none flex items-center justify-center gap-1.5 cursor-pointer',
              historyFilter === 'returned'
                ? 'bg-white text-slate-800 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            ]"
          >
            Returned
            <span :class="['px-1.5 py-0.2 text-[10px] rounded-full', historyFilter === 'returned' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-200/60 text-slate-500']">
              {{ historyCounts.returned }}
            </span>
          </button>

          <button
            @click="historyFilter = 'currently_borrowed'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 sm:flex-none flex items-center justify-center gap-1.5 cursor-pointer',
              historyFilter === 'currently_borrowed'
                ? 'bg-white text-slate-800 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            ]"
          >
            Currently Borrowed
            <span :class="['px-1.5 py-0.2 text-[10px] rounded-full', historyFilter === 'currently_borrowed' ? 'bg-sky-100 text-sky-800 font-bold' : 'bg-slate-200/60 text-slate-500']">
              {{ historyCounts.currentlyBorrowed }}
            </span>
          </button>
        </div>
      </div>

      <!-- History Table -->
      <div v-if="store.loadingTransactions" class="py-12 text-center text-slate-400">
        <ArrowPathIcon class="w-8 h-8 animate-spin mx-auto mb-2 text-[#447794]" />
        <p class="text-sm">Loading borrowing records...</p>
      </div>

      <div v-else-if="store.myTransactions.length === 0" class="py-16 text-center text-slate-400">
        <BookOpenIcon class="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p class="font-medium text-slate-600">No borrowing history</p>
        <p class="text-sm mt-1">You haven't borrowed any books from the library yet.</p>
      </div>

      <div v-else-if="filteredHistory.length === 0" class="py-16 text-center text-slate-400">
        <p class="font-medium text-slate-600">No {{ historyFilter === 'returned' ? 'returned' : 'currently borrowed' }} records</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="table-header px-4 py-3 text-left">Book Title / Author</th>
              <th class="table-header px-4 py-3 text-left">Accession / Barcode</th>
              <th class="table-header px-4 py-3 text-left">Checkout Date</th>
              <th class="table-header px-4 py-3 text-left">Due Date</th>
              <th class="table-header px-4 py-3 text-left">Status</th>
              <th class="table-header px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="tx in filteredHistory" :key="tx.id" class="hover:bg-slate-50/60 transition-colors text-sm">
              <td class="px-4 py-3">
                <p class="font-semibold text-slate-800">{{ tx.bookCopy.book.title }}</p>
                <p class="text-xs text-slate-500 mt-0.5">{{ tx.bookCopy.book.authors?.join(', ') ?? 'Unknown Author' }}</p>
              </td>
              <td class="px-4 py-3 font-mono text-xs text-slate-600">
                {{ tx.bookCopy.barcode }}
              </td>
              <td class="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                {{ formatDate(tx.checkoutDate) }}
              </td>
              <td class="px-4 py-3 text-xs whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <span :class="daysUntilDue(tx.dueDate) <= 3 && tx.status === 'active' ? 'text-amber-600 font-semibold' : 'text-slate-600'">
                    {{ formatDate(tx.dueDate) }}
                  </span>
                  <span v-if="tx.status === 'overdue'" class="text-rose-600 font-bold flex items-center gap-1">
                    <ExclamationTriangleIcon class="w-3.5 h-3.5 inline" />
                    ({{ tx.overdueDays }}d overdue)
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold capitalize', txStatusBadge(tx.status)]">
                  {{ tx.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  v-if="tx.status === 'active' && tx.renewalCount < 2"
                  @click="handleRenew(tx.id)"
                  class="btn-ghost text-xs py-1 px-2.5 justify-center inline-flex items-center gap-1"
                >
                  <ArrowPathIcon class="w-3.5 h-3.5" />
                  Renew
                </button>
                <span v-else-if="tx.status === 'active' && tx.renewalCount >= 2" class="text-xs text-slate-400">
                  Max Renewals
                </span>
                <span v-else-if="tx.status === 'returned'" class="text-xs text-slate-400">
                  Returned {{ formatDate(tx.returnDate) }}
                </span>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- DETAIL MODAL FOR REQUEST -->
    <div v-if="detailModalRequest" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <span :class="[
              'px-2 py-0.5 rounded-full text-xs font-bold uppercase',
              detailModalRequest.requestType === 'borrow' ? 'bg-[#447794]/10 text-[#447794]' : 'bg-purple-100 text-purple-700'
            ]">
              {{ detailModalRequest.requestType }}
            </span>
            <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold capitalize', statusBadgeClass(detailModalRequest.status)]">
              {{ detailModalRequest.status }}
            </span>
          </div>
          <button @click="detailModalRequest = null" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 class="text-lg font-bold text-slate-800">
            {{ detailModalRequest.requestType === 'borrow' ? detailModalRequest.book?.title : detailModalRequest.title }}
          </h3>
          <p v-if="detailModalRequest.otherTitle" class="text-xs text-slate-500 italic mt-0.5">
            {{ detailModalRequest.otherTitle }}
          </p>
          <p v-if="detailModalRequest.author" class="text-sm text-slate-600 mt-1">
            by {{ detailModalRequest.author }}
          </p>
          <p v-else-if="detailModalRequest.book?.authors?.length" class="text-sm text-slate-600 mt-1">
            by {{ detailModalRequest.book.authors.join(', ') }}
          </p>
        </div>

        <!-- Key Specs Grid -->
        <div class="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span class="text-slate-400 block font-medium">Item Type</span>
            <span class="text-slate-700 font-semibold">{{ detailModalRequest.itemType || 'BOOKS' }}</span>
          </div>
          <div v-if="detailModalRequest.isbn">
            <span class="text-slate-400 block font-medium">ISBN / Ref No.</span>
            <span class="text-slate-700 font-semibold font-mono">{{ detailModalRequest.isbn }}</span>
          </div>
          <div v-if="detailModalRequest.issn">
            <span class="text-slate-400 block font-medium">ISSN</span>
            <span class="text-slate-700 font-semibold font-mono">{{ detailModalRequest.issn }}</span>
          </div>
          <div v-if="detailModalRequest.callNumber">
            <span class="text-slate-400 block font-medium">Call Number</span>
            <span class="text-slate-700 font-semibold font-mono">{{ detailModalRequest.callNumber }}</span>
          </div>
          <div v-if="detailModalRequest.publisher">
            <span class="text-slate-400 block font-medium">Publisher</span>
            <span class="text-slate-700 font-semibold">{{ detailModalRequest.publisher }}</span>
          </div>
          <div v-if="detailModalRequest.publishYear">
            <span class="text-slate-400 block font-medium">Publish Year</span>
            <span class="text-slate-700 font-semibold">{{ detailModalRequest.publishYear }}</span>
          </div>
          <div v-if="detailModalRequest.edition">
            <span class="text-slate-400 block font-medium">Edition</span>
            <span class="text-slate-700 font-semibold">{{ detailModalRequest.edition }}</span>
          </div>
          <div v-if="detailModalRequest.category?.name">
            <span class="text-slate-400 block font-medium">Category</span>
            <span class="text-slate-700 font-semibold">{{ detailModalRequest.category.name }}</span>
          </div>
          <div v-if="detailModalRequest.language">
            <span class="text-slate-400 block font-medium">Language</span>
            <span class="text-slate-700 font-semibold">{{ detailModalRequest.language }}</span>
          </div>
          <div>
            <span class="text-slate-400 block font-medium">Date Requested</span>
            <span class="text-slate-700 font-semibold">{{ formatDate(detailModalRequest.createdAt) }}</span>
          </div>
        </div>

        <div v-if="detailModalRequest.description" class="text-xs space-y-1">
          <span class="text-slate-400 font-semibold block uppercase tracking-wider">Description</span>
          <p class="text-slate-700 bg-slate-50 p-3 rounded-xl leading-relaxed">{{ detailModalRequest.description }}</p>
        </div>

        <div v-if="detailModalRequest.reason" class="text-xs space-y-1">
          <span class="text-slate-400 font-semibold block uppercase tracking-wider">Faculty Justification</span>
          <p class="text-slate-700 bg-amber-50/60 border border-amber-100 p-3 rounded-xl italic leading-relaxed">
            "{{ detailModalRequest.reason }}"
          </p>
        </div>

        <div v-if="detailModalRequest.librarianNotes" class="text-xs space-y-1">
          <span class="text-slate-400 font-semibold block uppercase tracking-wider">Librarian Response</span>
          <p class="text-emerald-800 bg-emerald-50 border border-emerald-100 p-3 rounded-xl leading-relaxed font-medium">
            {{ detailModalRequest.librarianNotes }}
          </p>
        </div>

        <div class="pt-3 border-t border-slate-100 flex justify-end">
          <button @click="detailModalRequest = null" class="btn-ghost text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
