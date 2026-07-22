<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { format, parseISO } from 'date-fns'
import { useLibraryStore, type BookRequestItem } from '@/stores/useLibraryStore'
import {
  DocumentTextIcon, CheckCircleIcon, XCircleIcon, ClockIcon,
  ChatBubbleBottomCenterTextIcon, ArrowsUpDownIcon, MagnifyingGlassIcon,
  EyeIcon, XMarkIcon, CheckIcon, AcademicCapIcon, BookOpenIcon,
  UserCircleIcon, IdentificationIcon, EnvelopeIcon, BuildingLibraryIcon,
  TagIcon, InformationCircleIcon
} from '@heroicons/vue/24/outline'
import DropdownFilter from '@/components/DropdownFilter.vue'
import Pagination from '@/components/Pagination.vue'

const store = useLibraryStore()

const searchQuery = ref('')
const currentLimit = ref(10)
const filterStatus = ref<string>('all')
const sortBy = ref('date')
const sortOrder = ref<'ASC'|'DESC'>('DESC')

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Fulfilled', value: 'fulfilled' }
]

const sortOptions = [
  { label: 'Date Requested', value: 'date' },
  { label: 'Title (A-Z)', value: 'title' },
  { label: 'Faculty Name', value: 'faculty' }
]

// Modal states
const detailModalRequest = ref<BookRequestItem | null>(null)
const actionModal = ref<{ show: boolean; requestId: number | null; action: string }>({
  show: false,
  requestId: null,
  action: '',
})
const librarianNotes = ref('')
const actionLoading = ref(false)

onMounted(() => {
  fetchRequests(1)
})

function fetchRequests(page = 1) {
  store.fetchAllBookRequests(
    page,
    currentLimit.value,
    filterStatus.value === 'all' ? undefined : filterStatus.value
  )
}

function onLimitChange(newLimit: number) {
  currentLimit.value = newLimit
  fetchRequests(1)
}

function onFilterChange() {
  fetchRequests(1)
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return 'N/A'
  try { return format(parseISO(dateStr), 'MMM d, yyyy h:mm a') } catch { return dateStr }
}

const filteredRequests = computed(() => {
  let res = [...store.allBookRequests]
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    res = res.filter(req => {
      const title = (req.requestType === 'borrow' ? req.book?.title : req.title) || ''
      const author = (req.requestType === 'borrow' ? req.book?.authors?.join(' ') : req.author) || ''
      const isbn = (req.requestType === 'borrow' ? req.book?.isbn : req.isbn) || ''
      const publisher = (req.requestType === 'borrow' ? req.book?.publisher : req.publisher) || ''
      const faculty = `${req.user?.firstName} ${req.user?.lastName}`
      const instId = req.user?.institutionalId || ''
      const dept = req.user?.department?.name || ''
      const email = req.user?.email || ''
      return (
        title.toLowerCase().includes(q) ||
        author.toLowerCase().includes(q) ||
        isbn.toLowerCase().includes(q) ||
        publisher.toLowerCase().includes(q) ||
        faculty.toLowerCase().includes(q) ||
        instId.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q)
      )
    })
  }

  res.sort((a, b) => {
    let valA, valB
    if (sortBy.value === 'title') {
      valA = (a.requestType === 'borrow' ? a.book?.title : a.title) || ''
      valB = (b.requestType === 'borrow' ? b.book?.title : b.title) || ''
    } else if (sortBy.value === 'faculty') {
      valA = `${a.user?.lastName} ${a.user?.firstName}`.toLowerCase()
      valB = `${b.user?.lastName} ${b.user?.firstName}`.toLowerCase()
    } else {
      valA = new Date(a.createdAt).getTime()
      valB = new Date(b.createdAt).getTime()
    }
    
    if (valA < valB) return sortOrder.value === 'ASC' ? -1 : 1
    if (valA > valB) return sortOrder.value === 'ASC' ? 1 : -1
    return 0
  })
  
  return res
})

function handleSortChange() {
  if ((sortBy.value === 'title' || sortBy.value === 'faculty') && sortOrder.value === 'DESC') {
    sortOrder.value = 'ASC'
  } else if (sortBy.value === 'date') {
    sortOrder.value = 'DESC'
  }
}

// ── Detail Modal Handlers ───────────────────────────────────────────────────
function openDetailModal(req: BookRequestItem) {
  detailModalRequest.value = req
  librarianNotes.value = req.librarianNotes || ''
}

function closeDetailModal() {
  detailModalRequest.value = null
  librarianNotes.value = ''
}

async function handleDetailAction(status: 'approved' | 'rejected' | 'fulfilled') {
  if (!detailModalRequest.value) return
  actionLoading.value = true
  try {
    await store.updateBookRequestStatus(
      detailModalRequest.value.id,
      status,
      librarianNotes.value || undefined,
    )
    await fetchRequests(store.allBookRequestsPage)
    // Update active modal reference if still open
    const updated = store.allBookRequests.find(r => r.id === detailModalRequest.value?.id)
    if (updated) {
      detailModalRequest.value = updated
    } else {
      closeDetailModal()
    }
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Action failed')
  } finally {
    actionLoading.value = false
  }
}

// ── Quick Action Modal Handlers ──────────────────────────────────────────────
function openActionModal(requestId: number, action: string) {
  actionModal.value = { show: true, requestId, action }
  librarianNotes.value = ''
}

function closeModal() {
  actionModal.value = { show: false, requestId: null, action: '' }
  librarianNotes.value = ''
}

async function confirmAction() {
  if (!actionModal.value.requestId) return
  actionLoading.value = true
  try {
    await store.updateBookRequestStatus(
      actionModal.value.requestId,
      actionModal.value.action,
      librarianNotes.value || undefined,
    )
    fetchRequests(store.allBookRequestsPage)
    closeModal()
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Action failed')
  } finally {
    actionLoading.value = false
  }
}

const pendingCount = computed(() => store.pendingRequestCount)
</script>

<template>
  <div class="w-full max-w-[1600px] mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <DocumentTextIcon class="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-800">Faculty Book Requests</h2>
          <p class="text-xs text-slate-500">Manage faculty borrow and acquisition requests</p>
        </div>
      </div>
      <div v-if="pendingCount > 0" class="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">
        <span class="text-amber-700 font-semibold text-sm">{{ pendingCount }} pending</span>
      </div>
    </div>

    <!-- Filters Header Box -->
    <div class="filter-card">
      <div class="relative flex-1 w-full md:w-auto">
        <MagnifyingGlassIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search by title, author, ISBN, faculty name, ID, department..."
          class="w-full pl-10 pr-4 py-2 bg-slate-50 md:bg-white border border-slate-200/80 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5c726a]/30 focus:border-[#5c726a]"
        />
      </div>
      <div class="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
        <DropdownFilter
          v-model="filterStatus"
          :options="statusOptions"
          @change="onFilterChange"
          width="w-40"
        />

        <DropdownFilter
          v-model="sortBy"
          :options="sortOptions"
          @change="handleSortChange"
          width="w-48"
        />
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="store.loadingBookRequests" class="space-y-3">
      <div v-for="i in 4" :key="i" class="table-card p-5">
        <div class="skeleton h-5 w-2/3 mb-2" />
        <div class="skeleton h-4 w-1/3" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredRequests.length === 0" class="table-card py-16 text-center text-slate-400">
      <DocumentTextIcon class="w-12 h-12 mx-auto mb-3 text-slate-300" />
      <p class="font-medium text-slate-500">No {{ filterStatus === 'all' ? '' : filterStatus }} requests found</p>
      <p class="text-sm mt-1">Try adjusting your search or filters.</p>
    </div>

    <!-- Requests Table Card -->
    <div v-else class="table-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr>
              <th class="table-header text-left">Type</th>
              <th class="table-header text-left">Book / Title</th>
              <th class="table-header text-left">Faculty Requestor</th>
              <th class="table-header text-left">Date Requested</th>
              <th class="table-header text-left">Status</th>
              <th class="table-header text-right pr-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="req in filteredRequests"
              :key="req.id"
              class="table-row cursor-pointer hover:bg-slate-50/80 transition-colors"
              @click="openDetailModal(req)"
            >
              <!-- Request Type -->
              <td class="table-cell">
                <span :class="req.requestType === 'borrow' ? 'badge-pill-sky uppercase' : 'badge-pill-purple uppercase'">
                  {{ req.requestType }}
                </span>
              </td>

              <!-- Book / Title & Details -->
              <td class="table-cell max-w-[320px]">
                <p class="font-bold text-slate-800 truncate">
                  {{ req.requestType === 'borrow' ? req.book?.title : req.title }}
                </p>
                <div class="flex items-center gap-2 text-xs text-slate-500 mt-0.5 truncate">
                  <span v-if="req.requestType === 'borrow' && req.book?.authors?.length">
                    by {{ req.book.authors.join(', ') }}
                  </span>
                  <span v-else-if="req.requestType === 'acquisition' && req.author">
                    by {{ req.author }}
                  </span>
                  <span v-if="(req.requestType === 'borrow' ? req.book?.isbn : req.isbn)" class="font-mono text-slate-400">
                    · ISBN: {{ req.requestType === 'borrow' ? req.book?.isbn : req.isbn }}
                  </span>
                </div>
                <p v-if="req.reason" class="text-xs text-slate-400 truncate italic mt-1">"{{ req.reason }}"</p>
              </td>

              <!-- Faculty Requestor -->
              <td class="table-cell">
                <p class="font-bold text-slate-800 text-sm">{{ req.user?.firstName }} {{ req.user?.lastName }}</p>
                <p class="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span v-if="req.user?.institutionalId" class="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-600">
                    {{ req.user.institutionalId }}
                  </span>
                  <span>{{ req.user?.department?.name ?? '' }}</span>
                </p>
              </td>

              <!-- Date Requested -->
              <td class="table-cell text-xs font-mono text-slate-400 whitespace-nowrap">
                {{ formatDate(req.createdAt) }}
              </td>

              <!-- Status -->
              <td class="table-cell">
                <span v-if="req.status === 'approved'" class="badge-pill-green">
                  <span class="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                    <CheckIcon class="w-3 h-3 stroke-[3]" />
                  </span>
                  Approved
                </span>
                <span v-else-if="req.status === 'pending'" class="badge-pill-amber">
                  <span class="w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center">
                    <ClockIcon class="w-3 h-3 stroke-[2.5]" />
                  </span>
                  Pending
                </span>
                <span v-else-if="req.status === 'rejected'" class="badge-pill-rose">
                  <span class="w-4 h-4 rounded-full bg-rose-500/20 text-rose-600 flex items-center justify-center">
                    <XMarkIcon class="w-3 h-3 stroke-[3]" />
                  </span>
                  Rejected
                </span>
                <span v-else-if="req.status === 'fulfilled'" class="badge-pill-sky">
                  Fulfilled
                </span>
                <span v-else class="badge-pill-gray capitalize">
                  {{ req.status }}
                </span>
              </td>

              <!-- Actions -->
              <td class="table-cell text-right pr-6" @click.stop>
                <div class="flex items-center justify-end gap-2 text-xs font-semibold">
                  <button
                    @click="openDetailModal(req)"
                    class="text-[#5c726a] hover:text-[#3b4d47] inline-flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                    title="View Request Details"
                  >
                    <EyeIcon class="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  <template v-if="req.status === 'pending'">
                    <span class="text-slate-300">|</span>
                    <button
                      @click="openActionModal(req.id, 'approved')"
                      class="text-emerald-600 hover:text-emerald-700 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-50"
                    >
                      Approve
                    </button>
                    <button
                      @click="openActionModal(req.id, 'rejected')"
                      class="text-rose-600 hover:text-rose-700 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
                    >
                      Reject
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <Pagination
        v-if="store.allBookRequestsTotal > 0"
        :current-page="store.allBookRequestsPage"
        :last-page="store.allBookRequestsLastPage"
        :total-items="store.allBookRequestsTotal"
        :limit="currentLimit"
        @update:page="fetchRequests"
        @update:limit="onLimitChange"
      />
    </div>

    <!-- Full Request Details Modal (Similar to User Management View Modal) -->
    <Teleport to="body">
      <div v-if="detailModalRequest" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden max-h-[90vh] flex flex-col">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div class="flex items-center gap-3">
              <div :class="[
                'w-10 h-10 rounded-xl flex items-center justify-center',
                detailModalRequest.requestType === 'borrow' ? 'bg-sky-100 text-sky-600' : 'bg-purple-100 text-purple-600'
              ]">
                <BookOpenIcon v-if="detailModalRequest.requestType === 'borrow'" class="w-5 h-5" />
                <AcademicCapIcon v-else class="w-5 h-5" />
              </div>
              <div>
                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                  Book Request Details
                  <span class="font-mono text-xs text-slate-400 font-normal">#REQ-{{ detailModalRequest.id }}</span>
                </h3>
                <p class="text-xs text-slate-500 capitalize">
                  Submitted {{ formatDate(detailModalRequest.createdAt) }}
                </p>
              </div>
            </div>
            <button @click="closeDetailModal" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Modal Body (Scrollable) -->
          <div class="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/40">
            
            <!-- Badges Bar -->
            <div class="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex-wrap gap-3">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Request Type:</span>
                <span :class="detailModalRequest.requestType === 'borrow' ? 'badge-pill-sky uppercase font-bold' : 'badge-pill-purple uppercase font-bold'">
                  {{ detailModalRequest.requestType }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
                <span v-if="detailModalRequest.status === 'approved'" class="badge-pill-green">Approved</span>
                <span v-else-if="detailModalRequest.status === 'pending'" class="badge-pill-amber">Pending</span>
                <span v-else-if="detailModalRequest.status === 'rejected'" class="badge-pill-rose">Rejected</span>
                <span v-else class="badge-pill-gray capitalize">{{ detailModalRequest.status }}</span>
              </div>
            </div>

            <!-- Grid: Book Details & Faculty Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <!-- Card 1: Book / Acquisition Details -->
              <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <BookOpenIcon class="w-4 h-4 text-[#447794]" />
                  Book / Item Details
                </h4>
                
                <div>
                  <p class="text-[11px] text-slate-400 font-semibold uppercase">Title</p>
                  <p class="font-bold text-slate-800 text-base leading-snug">
                    {{ detailModalRequest.requestType === 'borrow' ? detailModalRequest.book?.title : detailModalRequest.title }}
                  </p>
                </div>

                <div>
                  <p class="text-[11px] text-slate-400 font-semibold uppercase">Author</p>
                  <p class="text-slate-700 text-sm font-medium">
                    {{ detailModalRequest.requestType === 'borrow' ? (detailModalRequest.book?.authors?.join(', ') || 'N/A') : (detailModalRequest.author || 'N/A') }}
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <p class="text-[11px] text-slate-400 font-semibold uppercase">Item Type</p>
                    <p class="text-slate-700 text-xs font-semibold">
                      {{ detailModalRequest.itemType || 'BOOKS' }}
                    </p>
                  </div>
                  <div>
                    <p class="text-[11px] text-slate-400 font-semibold uppercase">ISBN / UPC</p>
                    <p class="font-mono text-slate-700 text-xs font-medium">
                      {{ detailModalRequest.requestType === 'borrow' ? (detailModalRequest.book?.isbn || 'N/A') : (detailModalRequest.isbn || 'N/A') }}
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div v-if="detailModalRequest.issn">
                    <p class="text-[11px] text-slate-400 font-semibold uppercase">ISSN</p>
                    <p class="font-mono text-slate-700 text-xs font-medium">{{ detailModalRequest.issn }}</p>
                  </div>
                  <div>
                    <p class="text-[11px] text-slate-400 font-semibold uppercase">Publisher</p>
                    <p class="text-slate-700 text-xs font-medium">
                      {{ detailModalRequest.requestType === 'borrow' ? (detailModalRequest.book?.publisher || 'N/A') : (detailModalRequest.publisher || 'N/A') }}
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <p class="text-[11px] text-slate-400 font-semibold uppercase">Call Number</p>
                    <p class="font-mono text-slate-700 text-xs">
                      {{ detailModalRequest.requestType === 'borrow' ? (detailModalRequest.book?.callNumber || 'N/A') : (detailModalRequest.callNumber || 'N/A') }}
                    </p>
                  </div>
                  <div>
                    <p class="text-[11px] text-slate-400 font-semibold uppercase">Category</p>
                    <p class="text-slate-700 text-xs">
                      {{ detailModalRequest.requestType === 'borrow' ? (detailModalRequest.book?.category?.name || 'N/A') : (detailModalRequest.category?.name || 'N/A') }}
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <p class="text-[11px] text-slate-400 font-semibold uppercase">Publish Year</p>
                    <p class="text-slate-700 text-xs">
                      {{ detailModalRequest.requestType === 'borrow' ? (detailModalRequest.book?.publishYear || 'N/A') : (detailModalRequest.publishYear || 'N/A') }}
                    </p>
                  </div>
                  <div>
                    <p class="text-[11px] text-slate-400 font-semibold uppercase">Edition</p>
                    <p class="text-slate-700 text-xs">
                      {{ detailModalRequest.requestType === 'borrow' ? (detailModalRequest.book?.edition || 'N/A') : (detailModalRequest.edition || 'N/A') }}
                    </p>
                  </div>
                  <div>
                    <p class="text-[11px] text-slate-400 font-semibold uppercase">Language</p>
                    <p class="text-slate-700 text-xs">
                      {{ detailModalRequest.requestType === 'borrow' ? (detailModalRequest.book?.language || 'English') : (detailModalRequest.language || 'English') }}
                    </p>
                  </div>
                </div>

                <div v-if="detailModalRequest.description" class="pt-2 border-t border-slate-100">
                  <p class="text-[11px] text-slate-400 font-semibold uppercase">Description / Overview</p>
                  <p class="text-slate-700 text-xs mt-0.5 leading-relaxed">{{ detailModalRequest.description }}</p>
                </div>
              </div>

              <!-- Card 2: Faculty Requestor Info -->
              <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <UserCircleIcon class="w-4 h-4 text-[#447794]" />
                  Faculty Requestor Details
                </h4>

                <div>
                  <p class="text-[11px] text-slate-400 font-semibold uppercase">Full Name</p>
                  <p class="font-bold text-slate-800 text-base">
                    {{ detailModalRequest.user?.firstName }} {{ detailModalRequest.user?.lastName }}
                  </p>
                </div>

                <div>
                  <p class="text-[11px] text-slate-400 font-semibold uppercase">Institutional ID / Faculty ID</p>
                  <p class="font-mono text-slate-800 text-sm font-semibold">
                    {{ detailModalRequest.user?.institutionalId || 'N/A' }}
                  </p>
                </div>

                <div>
                  <p class="text-[11px] text-slate-400 font-semibold uppercase">Email Address</p>
                  <p class="text-slate-700 text-sm font-medium">
                    {{ detailModalRequest.user?.email || 'N/A' }}
                  </p>
                </div>

                <div>
                  <p class="text-[11px] text-slate-400 font-semibold uppercase">Department</p>
                  <p class="text-slate-700 text-sm font-medium">
                    {{ detailModalRequest.user?.department?.name || 'N/A' }}
                  </p>
                </div>
              </div>

            </div>

            <!-- Card 3: Reason / Justification -->
            <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2">
              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <InformationCircleIcon class="w-4 h-4 text-[#447794]" />
                Reason / Justification
              </h4>
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm leading-relaxed italic">
                "{{ detailModalRequest.reason || 'No reason specified by requestor.' }}"
              </div>
            </div>

            <!-- Card 4: Librarian Notes & Action -->
            <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ChatBubbleBottomCenterTextIcon class="w-4 h-4 text-[#447794]" />
                Librarian Review & Notes
              </h4>

              <!-- If Pending: Allow Librarian to process right here -->
              <div v-if="detailModalRequest.status === 'pending'" class="space-y-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Review Notes / Remarks (Optional)
                  </label>
                  <textarea
                    v-model="librarianNotes"
                    rows="3"
                    placeholder="Enter review remarks or justification for the faculty member..."
                    class="input resize-none"
                  />
                </div>

                <div class="flex gap-3 pt-1">
                  <button
                    @click="handleDetailAction('approved')"
                    :disabled="actionLoading"
                    class="flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    <CheckIcon class="w-4 h-4 stroke-[3]" />
                    {{ actionLoading ? 'Processing...' : 'Approve Request' }}
                  </button>
                  <button
                    @click="handleDetailAction('rejected')"
                    :disabled="actionLoading"
                    class="flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all flex items-center gap-2"
                  >
                    <XMarkIcon class="w-4 h-4 stroke-[3]" />
                    {{ actionLoading ? 'Processing...' : 'Reject Request' }}
                  </button>
                </div>
              </div>

              <!-- If Already Processed -->
              <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p class="text-[11px] text-slate-400 font-semibold uppercase">Processed Date</p>
                  <p class="text-slate-700 text-sm font-medium">{{ formatDate(detailModalRequest.processedAt) }}</p>
                </div>
                <div>
                  <p class="text-[11px] text-slate-400 font-semibold uppercase">Reviewed By</p>
                  <p class="text-slate-700 text-sm font-medium">
                    {{ detailModalRequest.librarian ? `${detailModalRequest.librarian.firstName} ${detailModalRequest.librarian.lastName}` : 'Administrator' }}
                  </p>
                </div>
                <div class="col-span-full">
                  <p class="text-[11px] text-slate-400 font-semibold uppercase">Librarian Notes</p>
                  <p class="text-slate-700 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1">
                    {{ detailModalRequest.librarianNotes || 'No notes added.' }}
                  </p>
                </div>
              </div>

            </div>

          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
            <button @click="closeDetailModal" class="btn-ghost px-6">Close</button>
          </div>

        </div>
      </div>
    </Teleport>

    <!-- Quick Action Modal -->
    <Teleport to="body">
      <div v-if="actionModal.show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
          <div class="flex items-center gap-3 mb-4">
            <div :class="[
              'w-10 h-10 rounded-xl flex items-center justify-center',
              actionModal.action === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            ]">
              <CheckCircleIcon v-if="actionModal.action === 'approved'" class="w-5 h-5" />
              <XCircleIcon v-else class="w-5 h-5" />
            </div>
            <h3 class="font-bold text-slate-800 capitalize">{{ actionModal.action }} Request</h3>
          </div>

          <div class="mb-4">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              <ChatBubbleBottomCenterTextIcon class="w-3.5 h-3.5 inline" /> Notes (optional)
            </label>
            <textarea
              v-model="librarianNotes"
              rows="3"
              placeholder="Add a note for the faculty member..."
              class="input resize-none"
            />
          </div>

          <div class="flex gap-3">
            <button @click="closeModal" class="btn-ghost flex-1 justify-center">Cancel</button>
            <button
              @click="confirmAction"
              :disabled="actionLoading"
              :class="[
                'flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                actionModal.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              ]"
            >
              {{ actionLoading ? 'Processing...' : 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
