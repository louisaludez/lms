<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import {
  UserPlusIcon, MagnifyingGlassIcon, PencilSquareIcon,
  TrashIcon, XMarkIcon, CheckIcon, FunnelIcon,
  UserCircleIcon, ArrowsUpDownIcon
} from '@heroicons/vue/24/outline'
import Pagination from '@/components/Pagination.vue'
import DropdownFilter from '@/components/DropdownFilter.vue'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Department { id: number; name: string; code: string }
interface UserRow {
  id: number
  institutionalId: string
  barcode: string
  email: string
  firstName: string
  lastName: string
  middleName: string | null
  role: string
  gender?: string
  department: Department | null
  eligibilityStatus: string
  accountApprovalStatus: 'pending' | 'approved' | 'rejected'
  isActive: boolean
  createdAt: string
}

// ── State ─────────────────────────────────────────────────────────────────────
const users        = ref<UserRow[]>([])
const departments  = ref<Department[]>([])
const loading      = ref(false)
const searchQuery  = ref('')
const filterRole           = ref('librarian')
const filterApprovalStatus = ref('')
const reviewingId          = ref<number | null>(null)

const sortBy               = ref('createdAt')
const sortOrder            = ref<'ASC'|'DESC'>('DESC')

const sortOptions = [
  { label: 'Date Joined', value: 'createdAt' },
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Department', value: 'department' }
]

const approvalOptions = [
  { label: 'All Approvals', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' }
]

// Modal
type ModalMode = 'create' | 'edit' | null
const modalMode    = ref<ModalMode>(null)
const saving       = ref(false)
const modalError   = ref('')
const editingId    = ref<number | null>(null)

const blankForm = () => ({
  firstName: '', lastName: '', middleName: '',
  email: '', password: 'Admin@1234',
  institutionalId: '', role: 'librarian', gender: 'Male',
  departmentId: '', eligibilityStatus: 'eligible',
  accountApprovalStatus: 'approved', isActive: true,
})
const form = ref(blankForm())

// Delete confirm
const deleteTarget = ref<UserRow | null>(null)
const deleting     = ref(false)

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  fetchUsers()
  fetchDepartments()
})

const currentPage = ref(1)
const lastPage    = ref(1)
const totalItems  = ref(0)
const currentLimit = ref(10)

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchUsers(page = 1) {
  loading.value = true
  try {
    const params: Record<string, string | number> = { 
      page, 
      limit: currentLimit.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value 
    }
    if (searchQuery.value) params.search = searchQuery.value
    if (filterRole.value) params.role = filterRole.value
    if (filterApprovalStatus.value) params.approvalStatus = filterApprovalStatus.value
    const { data } = await api.get<{ data: UserRow[], total: number, page: number, lastPage: number }>('/users', { params })
    users.value = data.data
    currentPage.value = data.page
    lastPage.value = data.lastPage
    totalItems.value = data.total
  } finally {
    loading.value = false
  }
}

async function fetchDepartments() {
  const { data } = await api.get<Department[]>('/users/departments')
  departments.value = data
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchUsers(1), 350)
}

function onLimitChange(newLimit: number) {
  currentLimit.value = newLimit
  fetchUsers(1)
}

function handleSortChange() {
  if (sortBy.value === 'name' && sortOrder.value === 'DESC') {
    sortOrder.value = 'ASC'
  } else if (sortBy.value === 'createdAt') {
    sortOrder.value = 'DESC'
  }
  fetchUsers(1)
}

// ── Modal helpers ──────────────────────────────────────────────────────────────
function openCreate() {
  form.value    = blankForm()
  editingId.value = null
  modalError.value = ''
  modalMode.value = 'create'
}

function openEdit(user: UserRow) {
  form.value = {
    firstName:       user.firstName,
    lastName:        user.lastName,
    middleName:      user.middleName ?? '',
    email:           user.email,
    password:        '',
    institutionalId: user.institutionalId,
    role:            user.role,
    gender:          user.gender ?? 'Male',
    departmentId:    user.department?.id?.toString() ?? '',
    eligibilityStatus: user.eligibilityStatus,
    accountApprovalStatus: user.accountApprovalStatus,
    isActive:        user.isActive,
  }
  editingId.value  = user.id
  modalError.value = ''
  modalMode.value  = 'edit'
}

function closeModal() {
  modalMode.value = null
  modalError.value = ''
}

// ── CRUD actions ──────────────────────────────────────────────────────────────
async function saveUser() {
  saving.value     = true
  modalError.value = ''
  try {
    if (modalMode.value === 'create') {
      const { eligibilityStatus, isActive, accountApprovalStatus, ...createPayload } = form.value
      await api.post('/users', {
        ...createPayload,
        barcode: createPayload.institutionalId,
        departmentId: createPayload.departmentId ? Number(createPayload.departmentId) : undefined,
      })
    } else {
      const payload: Record<string, any> = {
        firstName:        form.value.firstName,
        lastName:         form.value.lastName,
        middleName:       form.value.middleName || undefined,
        email:            form.value.email,
        role:             form.value.role,
        gender:           form.value.gender,
        departmentId:     form.value.departmentId ? Number(form.value.departmentId) : undefined,
        eligibilityStatus: form.value.eligibilityStatus,
        accountApprovalStatus: form.value.accountApprovalStatus,
        isActive:         form.value.isActive,
      }
      await api.patch(`/users/${editingId.value}`, payload)
    }
    closeModal()
    await fetchUsers(currentPage.value)
  } catch (e: any) {
    modalError.value = e.response?.data?.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

async function setApprovalStatus(userId: number, status: 'approved' | 'rejected') {
  reviewingId.value = userId
  try {
    await api.patch(`/users/${userId}`, { accountApprovalStatus: status })
    await fetchUsers(currentPage.value)
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Could not update approval status')
  } finally {
    reviewingId.value = null
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/users/${deleteTarget.value.id}`)
    deleteTarget.value = null
    await fetchUsers(currentPage.value)
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Delete failed')
  } finally {
    deleting.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function roleBadge(role: string) {
  const map: Record<string, string> = {
    student:   'bg-sky-100 text-sky-700',
    faculty:   'bg-purple-100 text-purple-700',
    librarian: 'bg-[#447794]/10 text-[#447794]',
    admin:     'bg-rose-100 text-rose-700',
  }
  return map[role] ?? 'bg-slate-100 text-slate-600'
}

function eligBadge(status: string) {
  const map: Record<string, string> = {
    eligible:  'bg-emerald-100 text-emerald-700',
    suspended: 'bg-amber-100 text-amber-700',
    expelled:  'bg-rose-100 text-rose-700',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}

function approvalBadge(status: string) {
  const map: Record<string, string> = {
    pending:  'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}
</script>

<template>
  <div class="w-full max-w-[1600px] mx-auto">

    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-[#447794]/10 flex items-center justify-center">
          <UserCircleIcon class="w-5 h-5 text-[#447794]" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-800">Manage Librarians</h2>
          <p class="text-xs text-slate-500">{{ totalItems }} librarian{{ totalItems !== 1 ? 's' : '' }} found</p>
        </div>
      </div>
      <button @click="openCreate" class="btn-primary">
        <UserPlusIcon class="w-4 h-4" /> Add Librarian
      </button>
    </div>

    <!-- Filters Header Box -->
    <div class="filter-card">
      <div class="relative flex-1 w-full md:w-auto">
        <MagnifyingGlassIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          v-model="searchQuery"
          @input="onSearch"
          type="search"
          placeholder="Search by name or email..."
          class="w-full pl-10 pr-4 py-2 bg-slate-50 md:bg-white border border-slate-200/80 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5c726a]/30 focus:border-[#5c726a]"
        />
      </div>
      <div class="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
        <DropdownFilter
          v-model="filterApprovalStatus"
          :options="approvalOptions"
          @change="fetchUsers(1)"
          width="w-40"
        />

        <DropdownFilter
          v-model="sortBy"
          :options="sortOptions"
          @change="handleSortChange"
          width="w-44"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="table-card">
      <!-- Loading skeleton -->
      <div v-if="loading" class="p-4 space-y-3">
        <div v-for="i in 5" :key="i" class="skeleton h-12 rounded-xl" />
      </div>

      <!-- Empty -->
      <div v-else-if="users.length === 0" class="py-16 text-center text-slate-400">
        <UserCircleIcon class="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p class="font-medium text-slate-500">No librarians found</p>
        <p class="text-sm mt-1">Try adjusting your search or filters.</p>
      </div>

      <!-- Data table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr>
              <th class="table-header text-left">Full Name</th>
              <th class="table-header text-left">Email</th>
              <th class="table-header text-left">Role</th>
              <th class="table-header text-left">Status</th>
              <th class="table-header text-left">Last Login</th>
              <th class="table-header text-right pr-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in users"
              :key="user.id"
              class="table-row"
            >
              <!-- Full Name -->
              <td class="table-cell font-bold text-slate-800">
                {{ user.firstName }} {{ user.lastName }}
              </td>
              <!-- Email -->
              <td class="table-cell text-slate-500">
                {{ user.email }}
              </td>
              <!-- Role -->
              <td class="table-cell">
                <span class="badge-pill-green">
                  Librarian
                </span>
              </td>
              <!-- Status -->
              <td class="table-cell">
                <span v-if="user.isActive" class="badge-pill-green">
                  <span class="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                    <CheckIcon class="w-3 h-3 stroke-[3]" />
                  </span>
                  Active
                </span>
                <span v-else class="badge-pill-rose">
                  <span class="w-4 h-4 rounded-full bg-rose-500/20 text-rose-600 flex items-center justify-center">
                    <XMarkIcon class="w-3 h-3 stroke-[3]" />
                  </span>
                  Inactive
                </span>
              </td>
              <!-- Last Login -->
              <td class="table-cell text-xs font-mono text-slate-400">
                {{ user.createdAt ? new Date(user.createdAt).toISOString() : 'Never' }}
              </td>
              <!-- Actions -->
              <td class="table-cell text-right pr-6">
                <div class="flex items-center justify-end gap-3 text-xs font-semibold">
                  <button
                    @click="openEdit(user)"
                    class="text-[#5c726a] hover:text-[#3b4d47] transition-colors"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    @click="deleteTarget = user"
                    class="text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 transition-colors"
                    title="Deactivate"
                  >
                    <span>Deactivate</span>
                    <TrashIcon class="w-3.5 h-3.5 text-rose-500" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <Pagination
        v-if="totalItems > 0"
        :current-page="currentPage"
        :last-page="lastPage"
        :total-items="totalItems"
        :limit="currentLimit"
        @update:page="fetchUsers"
        @update:limit="onLimitChange"
      />
    </div>

    <!-- Create / Edit Modal -->
    <Teleport to="body">
      <div v-if="modalMode" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-800 flex items-center gap-2">
              <UserPlusIcon class="w-5 h-5 text-[#447794]" />
              {{ modalMode === 'create' ? 'Create New Librarian' : 'Edit Librarian' }}
            </h3>
            <button @click="closeModal" class="text-slate-400 hover:text-slate-600">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="saveUser" class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">First Name *</label>
                <input v-model="form.firstName" type="text" required class="input" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Last Name *</label>
                <input v-model="form.lastName" type="text" required class="input" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Email *</label>
                <input v-model="form.email" type="email" required class="input" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Student/Faculty ID *</label>
                <input
                  v-model="form.institutionalId"
                  type="text"
                  :required="modalMode === 'create'"
                  :disabled="modalMode === 'edit'"
                  class="input font-mono"
                  placeholder="e.g. 2024-CCS-001"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Gender</label>
                <select v-model="form.gender" class="input">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Department</label>
                <select v-model="form.departmentId" class="input">
                  <option value="">Select department...</option>
                  <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
                </select>
              </div>
              <div v-if="modalMode === 'edit'">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Account approval</label>
                <select v-model="form.accountApprovalStatus" class="input">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div v-if="modalMode === 'edit'">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Eligibility</label>
                <select v-model="form.eligibilityStatus" class="input">
                  <option value="eligible">Eligible</option>
                  <option value="suspended">Suspended</option>
                  <option value="expelled">Expelled</option>
                </select>
              </div>
              <div v-if="modalMode === 'edit'" class="flex items-center gap-3 pt-5">
                <input v-model="form.isActive" type="checkbox" id="isActive" class="w-4 h-4 accent-[#447794]" />
                <label for="isActive" class="text-sm font-medium text-slate-700">Account Active</label>
              </div>
              <div v-if="modalMode === 'create'" class="col-span-2">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Default Password</label>
                <input v-model="form.password" type="text" class="input font-mono bg-slate-50 text-slate-500" disabled />
                <p class="text-[10px] text-slate-400 mt-1">Users can change this after login.</p>
              </div>
            </div>

            <div v-if="modalError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {{ modalError }}
            </div>

            <div class="flex gap-3 pt-2">
              <button type="button" @click="closeModal" class="btn-ghost flex-1 justify-center">Cancel</button>
              <button type="submit" :disabled="saving" class="btn-primary flex-1 justify-center">
                {{ saving ? 'Saving...' : modalMode === 'create' ? 'Create Librarian' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
          <div class="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <TrashIcon class="w-6 h-6 text-rose-600" />
          </div>
          <h3 class="font-bold text-slate-800 text-center mb-1">Deactivate User</h3>
          <p class="text-sm text-slate-500 text-center mb-5">
            Are you sure you want to deactivate
            <strong>{{ deleteTarget.firstName }} {{ deleteTarget.lastName }}</strong>?
            They will no longer be able to log in.
          </p>
          <div class="flex gap-3">
            <button @click="deleteTarget = null" class="btn-ghost flex-1 justify-center">Cancel</button>
            <button
              @click="confirmDelete"
              :disabled="deleting"
              class="flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-all"
            >
              {{ deleting ? 'Deactivating...' : 'Deactivate' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
