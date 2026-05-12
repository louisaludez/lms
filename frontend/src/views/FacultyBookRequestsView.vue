<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { format, parseISO } from 'date-fns'
import { useLibraryStore, useAuthStore } from '@/stores/useLibraryStore'
import NavBar from '@/components/NavBar.vue'
import {
  BookOpenIcon, PlusIcon, XMarkIcon, ClockIcon,
  CheckCircleIcon, XCircleIcon, PaperAirplaneIcon,
  DocumentTextIcon, AcademicCapIcon
} from '@heroicons/vue/24/outline'
import { ExclamationCircleIcon } from '@heroicons/vue/24/solid'

const store = useLibraryStore()
const auth = useAuthStore()

// Tab state
const activeTab = ref<'my-requests' | 'new-borrow' | 'new-acquisition'>('my-requests')

// Acquisition form state
const acqForm = ref({
  title: '',
  author: '',
  isbn: '',
  publisher: '',
  reason: '',
})
const acqLoading = ref(false)
const acqError = ref('')
const acqSuccess = ref(false)

onMounted(() => {
  store.fetchMyBookRequests()
})

function formatDate(dateStr: string) {
  try { return format(parseISO(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
    fulfilled: 'bg-sky-100 text-sky-700',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}

function statusIcon(status: string) {
  if (status === 'pending') return ClockIcon
  if (status === 'approved') return CheckCircleIcon
  if (status === 'rejected') return XCircleIcon
  return CheckCircleIcon
}

const pendingRequests = computed(() =>
  store.myBookRequests.filter(r => r.status === 'pending')
)
const processedRequests = computed(() =>
  store.myBookRequests.filter(r => r.status !== 'pending')
)

async function submitAcquisition() {
  acqLoading.value = true
  acqError.value = ''
  acqSuccess.value = false
  try {
    await store.requestAcquisition({
      title: acqForm.value.title,
      author: acqForm.value.author || undefined,
      isbn: acqForm.value.isbn || undefined,
      publisher: acqForm.value.publisher || undefined,
      reason: acqForm.value.reason,
    })
    acqSuccess.value = true
    acqForm.value = { title: '', author: '', isbn: '', publisher: '', reason: '' }
    setTimeout(() => { activeTab.value = 'my-requests' }, 1500)
  } catch (e: any) {
    acqError.value = e.response?.data?.message ?? 'Request failed'
  } finally {
    acqLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <NavBar />

    <!-- Header -->
    <div class="bg-gradient-to-r from-[#123249] to-[#447794] py-12 px-6">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <DocumentTextIcon class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">Book Requests</h1>
            <p class="text-[#aed0e2] text-sm">Faculty-exclusive: Request to borrow or suggest new acquisitions</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">

      <!-- Tabs -->
      <div class="flex gap-1 p-1 bg-slate-200/60 rounded-2xl mb-6 w-fit">
        <button
          @click="activeTab = 'my-requests'"
          :class="[
            'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
            activeTab === 'my-requests'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          ]"
        >
          <span class="flex items-center gap-2">
            <ClockIcon class="w-4 h-4" />
            My Requests
            <span v-if="pendingRequests.length > 0" class="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
              {{ pendingRequests.length }}
            </span>
          </span>
        </button>
        <button
          @click="activeTab = 'new-acquisition'"
          :class="[
            'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
            activeTab === 'new-acquisition'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          ]"
        >
          <span class="flex items-center gap-2">
            <PlusIcon class="w-4 h-4" />
            Request New Book
          </span>
        </button>
      </div>

      <!-- My Requests Tab -->
      <div v-if="activeTab === 'my-requests'">
        <!-- Loading -->
        <div v-if="store.loadingBookRequests" class="space-y-3">
          <div v-for="i in 3" :key="i" class="card p-5">
            <div class="skeleton h-5 w-1/2 mb-2" />
            <div class="skeleton h-4 w-1/3 mb-2" />
            <div class="skeleton h-3 w-3/4" />
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="store.myBookRequests.length === 0" class="card py-16 text-center">
          <DocumentTextIcon class="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p class="text-lg font-semibold text-slate-500">No requests yet</p>
          <p class="text-sm text-slate-400 mt-1">
            Browse the <router-link to="/opac" class="text-[#447794] hover:underline">catalog</router-link>
            and request a book, or suggest a new acquisition.
          </p>
        </div>

        <!-- Request list -->
        <div v-else class="space-y-3">
          <!-- Pending Section -->
          <template v-if="pendingRequests.length > 0">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pending ({{ pendingRequests.length }})</p>
            <div
              v-for="req in pendingRequests"
              :key="req.id"
              class="card p-5 border-l-4 border-amber-400"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold uppercase', req.requestType === 'borrow' ? 'bg-[#447794]/10 text-[#447794]' : 'bg-purple-100 text-purple-700']">
                      {{ req.requestType }}
                    </span>
                    <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold capitalize', statusBadgeClass(req.status)]">
                      {{ req.status }}
                    </span>
                  </div>
                  <p class="font-semibold text-slate-800 mt-1">
                    {{ req.requestType === 'borrow' ? req.book?.title : req.title }}
                  </p>
                  <p v-if="req.requestType === 'acquisition' && req.author" class="text-sm text-slate-500">by {{ req.author }}</p>
                  <p v-if="req.requestType === 'borrow' && req.book?.authors?.length" class="text-sm text-slate-500">by {{ req.book.authors.join(', ') }}</p>
                  <p v-if="req.reason" class="text-sm text-slate-500 mt-1 italic">"{{ req.reason }}"</p>
                </div>
                <span class="text-xs text-slate-400 whitespace-nowrap">{{ formatDate(req.createdAt) }}</span>
              </div>
            </div>
          </template>

          <!-- Processed Section -->
          <template v-if="processedRequests.length > 0">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-6">Processed ({{ processedRequests.length }})</p>
            <div
              v-for="req in processedRequests"
              :key="req.id"
              class="card p-5"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold uppercase', req.requestType === 'borrow' ? 'bg-[#447794]/10 text-[#447794]' : 'bg-purple-100 text-purple-700']">
                      {{ req.requestType }}
                    </span>
                    <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold capitalize', statusBadgeClass(req.status)]">
                      {{ req.status }}
                    </span>
                  </div>
                  <p class="font-semibold text-slate-800 mt-1">
                    {{ req.requestType === 'borrow' ? req.book?.title : req.title }}
                  </p>
                  <p v-if="req.librarianNotes" class="text-sm text-slate-500 mt-1 bg-slate-50 px-3 py-2 rounded-lg">
                    <strong>Librarian note:</strong> {{ req.librarianNotes }}
                  </p>
                </div>
                <span class="text-xs text-slate-400 whitespace-nowrap">{{ formatDate(req.createdAt) }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- New Acquisition Request Tab -->
      <div v-if="activeTab === 'new-acquisition'" class="card p-6">
        <div class="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
          <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <AcademicCapIcon class="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 class="font-semibold text-slate-800">Request New Book Acquisition</h2>
            <p class="text-xs text-slate-500">Suggest a book for the library to purchase</p>
          </div>
        </div>

        <form @submit.prevent="submitAcquisition" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Book Title *</label>
            <input v-model="acqForm.title" type="text" required placeholder="e.g. Advanced Machine Learning" class="input" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Author</label>
              <input v-model="acqForm.author" type="text" placeholder="e.g. John Smith" class="input" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">ISBN</label>
              <input v-model="acqForm.isbn" type="text" placeholder="e.g. 978-0-123456-78-9" class="input font-mono" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Publisher</label>
            <input v-model="acqForm.publisher" type="text" placeholder="e.g. Pearson Education" class="input" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reason / Justification *</label>
            <textarea
              v-model="acqForm.reason"
              required
              rows="3"
              placeholder="Why should the library acquire this book? (e.g. required for course curriculum, research reference)"
              class="input resize-none"
            />
          </div>

          <button type="submit" :disabled="acqLoading" class="btn-primary w-full justify-center">
            <PaperAirplaneIcon class="w-4 h-4" />
            {{ acqLoading ? 'Submitting...' : 'Submit Request' }}
          </button>
        </form>

        <div v-if="acqError" class="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {{ acqError }}
        </div>
        <div v-if="acqSuccess" class="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
          <p class="font-semibold text-emerald-700">✅ Request submitted successfully!</p>
          <p class="text-slate-600 mt-1">The library team will review your request.</p>
        </div>
      </div>

    </div>
  </div>
</template>
