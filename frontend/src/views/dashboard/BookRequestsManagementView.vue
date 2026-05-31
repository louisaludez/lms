<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { format, parseISO } from 'date-fns'
import { useLibraryStore } from '@/stores/useLibraryStore'
import {
  DocumentTextIcon, CheckCircleIcon, XCircleIcon,
  FunnelIcon, ChatBubbleBottomCenterTextIcon,
} from '@heroicons/vue/24/outline'

const store = useLibraryStore()

const filterStatus = ref<string>('all')
const actionModal = ref<{ show: boolean; requestId: number | null; action: string }>({
  show: false,
  requestId: null,
  action: '',
})
const librarianNotes = ref('')
const actionLoading = ref(false)

onMounted(() => {
  store.fetchAllBookRequests()
})

function formatDate(dateStr: string) {
  try { return format(parseISO(dateStr), 'MMM d, yyyy h:mm a') } catch { return dateStr }
}

const filteredRequests = computed(() => {
  if (filterStatus.value === 'all') return store.allBookRequests
  return store.allBookRequests.filter(r => r.status === filterStatus.value)
})

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
    closeModal()
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Action failed')
  } finally {
    actionLoading.value = false
  }
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

const pendingCount = computed(() =>
  store.allBookRequests.filter(r => r.status === 'pending').length
)
</script>

<template>
  <div class="max-w-5xl">
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

    <!-- Filters -->
    <div class="flex items-center gap-2 mb-4">
      <FunnelIcon class="w-4 h-4 text-slate-400" />
      <button
        v-for="s in ['all', 'pending', 'approved']"
        :key="s"
        @click="filterStatus = s"
        :class="[
          'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
          filterStatus === s
            ? 'bg-[#447794] text-white'
            : 'bg-white border border-slate-200 text-slate-600 hover:border-[#447794]/40'
        ]"
      >
        {{ s }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loadingBookRequests" class="space-y-3">
      <div v-for="i in 4" :key="i" class="card p-5">
        <div class="skeleton h-5 w-2/3 mb-2" />
        <div class="skeleton h-4 w-1/3" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredRequests.length === 0" class="card py-16 text-center text-slate-400">
      <DocumentTextIcon class="w-12 h-12 mx-auto mb-3 text-slate-300" />
      <p class="font-medium text-slate-500">No {{ filterStatus === 'all' ? '' : filterStatus }} requests</p>
    </div>

    <!-- Requests Table -->
    <div v-else class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="table-header px-4 py-3 text-left">Type</th>
              <th class="table-header px-4 py-3 text-left">Book / Title</th>
              <th class="table-header px-4 py-3 text-left">Faculty</th>
              <th class="table-header px-4 py-3 text-left">Date</th>
              <th class="table-header px-4 py-3 text-left">Status</th>
              <th class="table-header px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="req in filteredRequests"
              :key="req.id"
              class="table-row"
            >
              <td class="table-cell px-4">
                <span :class="[
                  'px-2 py-0.5 rounded-full text-xs font-bold uppercase',
                  req.requestType === 'borrow' ? 'bg-[#447794]/10 text-[#447794]' : 'bg-purple-100 text-purple-700'
                ]">
                  {{ req.requestType }}
                </span>
              </td>
              <td class="table-cell px-4 max-w-[250px]">
                <p class="font-medium text-slate-800 truncate">
                  {{ req.requestType === 'borrow' ? req.book?.title : req.title }}
                </p>
                <p v-if="req.reason" class="text-xs text-slate-400 truncate italic">"{{ req.reason }}"</p>
              </td>
              <td class="table-cell px-4">
                <p class="font-medium text-slate-700 text-sm">{{ req.user?.firstName }} {{ req.user?.lastName }}</p>
                <p class="text-xs text-slate-400">{{ req.user?.department?.name ?? '' }}</p>
              </td>
              <td class="table-cell px-4 text-sm text-slate-500 whitespace-nowrap">
                {{ formatDate(req.createdAt) }}
              </td>
              <td class="table-cell px-4">
                <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold capitalize', statusBadgeClass(req.status)]">
                  {{ req.status }}
                </span>
              </td>
              <td class="table-cell px-4">
                <div v-if="req.status === 'pending'" class="flex gap-1.5">
                  <button
                    @click="openActionModal(req.id, 'approved')"
                    class="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                    title="Approve"
                  >
                    <CheckCircleIcon class="w-4 h-4" />
                  </button>
                </div>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Action Modal -->
    <Teleport to="body">
      <div v-if="actionModal.show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
          <div class="flex items-center gap-3 mb-4">
            <div :class="[
              'w-10 h-10 rounded-xl flex items-center justify-center',
              actionModal.action === 'approved' ? 'bg-emerald-100' :
              actionModal.action === 'rejected' ? 'bg-rose-100' : 'bg-sky-100'
            ]">
              <CheckCircleIcon v-if="actionModal.action === 'approved'" class="w-5 h-5 text-emerald-600" />
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
                actionModal.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 hover:bg-slate-700'
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
