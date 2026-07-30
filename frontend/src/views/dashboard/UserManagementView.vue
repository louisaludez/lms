<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import {
  UserPlusIcon, MagnifyingGlassIcon, PencilSquareIcon,
  TrashIcon, XMarkIcon, CheckIcon, FunnelIcon,
  UserCircleIcon,
  QrCodeIcon, ArrowDownTrayIcon, ArrowPathIcon, EyeIcon, ArrowsUpDownIcon
} from '@heroicons/vue/24/outline'
import JsBarcode from 'jsbarcode'
import { toPng } from 'html-to-image'
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
  profilePhotoUrl: string | null
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
const filterRole           = ref('')
const filterApprovalStatus = ref('')
const reviewingId          = ref<number | null>(null)

const sortBy               = ref('createdAt')
const sortOrder            = ref<'ASC'|'DESC'>('DESC')

const sortOptions = [
  { label: 'Date Joined', value: 'createdAt' },
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Department', value: 'department' }
]

const roleOptions = [
  { label: 'All Roles', value: '' },
  { label: 'Student', value: 'student' },
  { label: 'Faculty', value: 'faculty' },
  { label: 'Librarian', value: 'librarian' },
  { label: 'Admin', value: 'admin' }
]

const approvalOptions = [
  { label: 'All Approvals', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' }
]

// View ID
const viewingIdUser = ref<UserRow | null>(null)
const barcodeCanvas = ref<HTMLCanvasElement | null>(null)
const idCardRef = ref<HTMLElement | null>(null)
const isDownloadingId = ref(false)
import { watch } from 'vue'

watch(() => viewingIdUser.value, (user) => {
  if (user?.barcode) {
    setTimeout(() => {
      if (barcodeCanvas.value) {
        JsBarcode(barcodeCanvas.value, user.barcode, {
          format: "CODE128",
          lineColor: "#0f172a",
          width: 2,
          height: 40,
          displayValue: false,
          margin: 0,
          background: "transparent",
        })
      }
    }, 50)
  }
})

async function downloadId() {
  if (!idCardRef.value || isDownloadingId.value || !viewingIdUser.value) return
  
  isDownloadingId.value = true
  try {
    const dataUrl = await toPng(idCardRef.value, {
      pixelRatio: 3,
      cacheBust: true,
    })
    const link = document.createElement('a')
    link.download = `lumina-id-${viewingIdUser.value.barcode}.png`
    link.href = dataUrl
    link.click()
  } catch (err: any) {
    console.error("Failed to generate ID:", err)
    alert("Failed to download ID. Error: " + (err.message || err))
  } finally {
    isDownloadingId.value = false
  }
}

// Modal
type ModalMode = 'create' | 'edit' | null
const modalMode    = ref<ModalMode>(null)
const saving       = ref(false)
const modalError   = ref('')
const editingId    = ref<number | null>(null)

const blankForm = () => ({
  firstName: '', lastName: '', middleName: '',
  email: '', password: 'Admin@1234',
  institutionalId: '', role: 'student', gender: 'Male',
  departmentId: '', eligibilityStatus: 'eligible',
  accountApprovalStatus: 'approved', isActive: true,
  displayPicture: null as File | null,
})
const form = ref(blankForm())

// Delete confirm
const deleteTarget = ref<UserRow | null>(null)
const deleting     = ref(false)

// Reject confirm
const rejectTarget    = ref<UserRow | null>(null)
const rejectionReason = ref('')
const rejecting       = ref(false)

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
    displayPicture:  null as File | null,
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
      const fd = new FormData()
      Object.entries(createPayload).forEach(([key, value]) => {
        if (key === 'displayPicture' && value) {
          fd.append('displayPicture', value as File)
        } else if (value !== undefined && value !== null && key !== 'displayPicture') {
          fd.append(key, value.toString())
        }
      })
      fd.append('barcode', createPayload.institutionalId)

      await api.post('/users', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
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
      
      const fd = new FormData()
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          fd.append(key, value.toString())
        }
      })
      if (form.value.displayPicture) {
        fd.append('displayPicture', form.value.displayPicture as File)
      }

      await api.patch(`/users/${editingId.value}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
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

function openRejectModal(user: UserRow) {
  rejectTarget.value = user
  rejectionReason.value = ''
  viewingIdUser.value = null
}

async function confirmReject() {
  if (!rejectTarget.value) return
  if (!rejectionReason.value.trim()) {
    alert('Please provide a reason for rejection.')
    return
  }
  
  rejecting.value = true
  try {
    await api.patch(`/users/${rejectTarget.value.id}`, { 
      accountApprovalStatus: 'rejected',
      rejectionReason: rejectionReason.value.trim()
    })
    rejectTarget.value = null
    await fetchUsers(currentPage.value)
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Could not reject user')
  } finally {
    rejecting.value = false
  }
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.')
      target.value = ''
      form.value.displayPicture = null
      return
    }
    form.value.displayPicture = file
  } else {
    form.value.displayPicture = null
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
          <h2 class="text-lg font-bold text-slate-800">Manage Users</h2>
          <p class="text-xs text-slate-500">{{ totalItems }} user{{ totalItems !== 1 ? 's' : '' }} found</p>
        </div>
      </div>
      <button @click="openCreate" class="btn-primary">
        <UserPlusIcon class="w-4 h-4" /> Add User
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
          v-model="filterRole"
          :options="roleOptions"
          @change="fetchUsers(1)"
          width="w-36"
        />

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
        >
          <template #icon>
            <ArrowsUpDownIcon class="w-4 h-4 text-slate-400" />
          </template>
        </DropdownFilter>
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
        <p class="font-medium text-slate-500">No users found</p>
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
                <span v-if="user.role === 'admin'" class="badge-pill-green">
                  Administrator
                </span>
                <span v-else-if="user.role === 'librarian'" class="badge-pill-green">
                  Librarian
                </span>
                <span v-else-if="user.role === 'student'" class="badge-pill-sky">
                  Student
                </span>
                <span v-else-if="user.role === 'faculty'" class="badge-pill-purple">
                  Faculty
                </span>
                <span v-else class="badge-pill-gray capitalize">
                  {{ user.role }}
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
                  <template v-if="user.accountApprovalStatus === 'pending'">
                    <button
                      type="button"
                      @click="viewingIdUser = user"
                      class="text-amber-600 hover:text-amber-700 transition-colors"
                      title="Review Registration"
                    >
                      Review
                    </button>
                  </template>
                  <button
                    v-else-if="user.role === 'student' || user.role === 'faculty'"
                    @click="viewingIdUser = user"
                    class="text-[#5c726a] hover:text-[#3b4d47] transition-colors"
                    title="View ID"
                  >
                    Digital ID
                  </button>
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
              {{ modalMode === 'create' ? 'Create New User' : 'Edit User' }}
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
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Role *</label>
                <select v-model="form.role" required class="input">
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="librarian">Librarian</option>
                  <option value="admin">Admin</option>
                </select>
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
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Department *</label>
                <select v-model="form.departmentId" required class="input">
                  <option value="" disabled>Select department...</option>
                  <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
                </select>
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Profile Picture</label>
                <input type="file" accept="image/*" @change="handleFileChange" class="input p-2" />
                <p v-if="modalMode === 'edit'" class="text-[10px] text-slate-400 mt-1">Leave blank to keep the current picture.</p>
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
                {{ saving ? 'Saving...' : modalMode === 'create' ? 'Create User' : 'Save Changes' }}
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

    <!-- Reject Confirm Modal -->
    <Teleport to="body">
      <div v-if="rejectTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
          <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <XMarkIcon class="w-6 h-6 text-amber-600" />
          </div>
          <h3 class="font-bold text-slate-800 text-center mb-1">Reject Registration</h3>
          <p class="text-sm text-slate-500 text-center mb-5">
            Please provide a reason for rejecting
            <strong>{{ rejectTarget.firstName }} {{ rejectTarget.lastName }}'s</strong> registration. This will be emailed to them.
          </p>
          
          <textarea
            v-model="rejectionReason"
            placeholder="Enter reason for rejection..."
            class="input w-full h-24 mb-5 resize-none"
            required
          ></textarea>

          <div class="flex gap-3">
            <button @click="rejectTarget = null" class="btn-ghost flex-1 justify-center">Cancel</button>
            <button
              @click="confirmReject"
              :disabled="rejecting"
              class="flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-all"
            >
              {{ rejecting ? 'Rejecting...' : 'Confirm Reject' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- View ID / Profile Modal -->
    <Teleport to="body">
      <div v-if="viewingIdUser" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
          
          <!-- Left side: Profile Info -->
          <div class="flex-1 p-6 lg:p-8 bg-slate-50 flex flex-col overflow-y-auto">
            <div class="flex justify-between items-start mb-6">
              <h3 class="font-bold text-2xl text-slate-800 flex items-center gap-3">
                <UserCircleIcon class="w-8 h-8 text-[#447794]" />
                User Profile
              </h3>
              <button @click="viewingIdUser = null" class="md:hidden text-slate-400 hover:text-slate-600">
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>
            
            <div class="space-y-6 flex-1">
              <div class="flex items-center gap-5">
                <div class="w-24 h-24 rounded-full bg-slate-200 overflow-hidden ring-4 ring-white shadow-md flex-shrink-0">
                  <img v-if="viewingIdUser.profilePhotoUrl" :src="viewingIdUser.profilePhotoUrl" class="w-full h-full object-cover" />
                  <UserCircleIcon v-else class="w-full h-full text-slate-400 bg-white" />
                </div>
                <div>
                  <h4 class="text-2xl font-bold text-slate-800">{{ viewingIdUser.firstName }} {{ viewingIdUser.lastName }}</h4>
                  <p class="text-slate-500 text-sm font-medium mt-0.5">{{ viewingIdUser.email }}</p>
                  <div class="mt-3 flex gap-2 flex-wrap">
                    <span :class="['px-2.5 py-1 rounded-full text-xs font-bold capitalize', roleBadge(viewingIdUser.role)]">
                      {{ viewingIdUser.role }}
                    </span>
                    <span :class="['px-2.5 py-1 rounded-full text-xs font-bold capitalize', eligBadge(viewingIdUser.eligibilityStatus)]">
                      {{ viewingIdUser.eligibilityStatus }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Institutional ID</p>
                  <p class="font-mono text-slate-800 font-medium">{{ viewingIdUser.institutionalId }}</p>
                </div>
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Department</p>
                  <p class="text-slate-800 font-medium">{{ viewingIdUser.department?.name ?? '—' }}</p>
                </div>
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Gender</p>
                  <p class="text-slate-800 font-medium">{{ viewingIdUser.gender ?? '—' }}</p>
                </div>
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Joined Date</p>
                  <p class="text-slate-800 font-medium">{{ new Date(viewingIdUser.createdAt).toLocaleDateString() }}</p>
                </div>
              </div>

              <!-- Registration Review Actions -->
              <div v-if="viewingIdUser.accountApprovalStatus === 'pending'" class="mt-auto pt-6 border-t border-slate-100 flex gap-3">
                <button
                  :disabled="reviewingId === viewingIdUser.id"
                  @click="openRejectModal(viewingIdUser)"
                  class="flex-1 flex justify-center items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
                >
                  <XMarkIcon class="w-5 h-5 mr-2" />
                  Reject Registration
                </button>
                <button
                  :disabled="reviewingId === viewingIdUser.id"
                  @click="setApprovalStatus(viewingIdUser.id, 'approved'); viewingIdUser = null"
                  class="flex-1 flex justify-center items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm shadow-emerald-200"
                >
                  <CheckIcon class="w-5 h-5 mr-2" />
                  Approve Registration
                </button>
              </div>
            </div>
          </div>

          <!-- Right side: ID Card -->
          <div class="p-6 lg:p-8 bg-white flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-100 relative min-w-[320px]">
            <button @click="viewingIdUser = null" class="hidden md:block absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <XMarkIcon class="w-6 h-6" />
            </button>
            
            <p class="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <QrCodeIcon class="w-5 h-5 text-[#447794]" />
              Digital ID Preview
            </p>

            <!-- ID Card Render -->
            <div 
              ref="idCardRef"
              class="relative overflow-hidden rounded-xl shadow-lg bg-white select-none mb-6"
              style="width: 346px; height: 599px; transform: scale(0.75); transform-origin: top center; margin-bottom: -120px;"
            >
              <!-- Background Template -->
              <img src="@/assets/id.png" class="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" alt="ID Template" crossorigin="anonymous" />
              
              <!-- "AUTOMATED ID" Title -->
              <div class="absolute z-10 w-full text-center flex justify-center" style="top: 100px;">
                <h3 class="text-[14px] font-black text-[#1a233a] uppercase tracking-widest drop-shadow-sm">AUTOMATED ID</h3>
              </div>

              <!-- Photo with Red Border -->
              <div class="absolute z-10 overflow-hidden border-[3px] border-[#b91c1c] flex items-center justify-center bg-white" style="width: 140px; height: 160px; left: 50%; top: 145px; transform: translateX(-50%); border-radius: 12px;">
                <img v-if="viewingIdUser.profilePhotoUrl" :src="viewingIdUser.profilePhotoUrl" class="w-full h-full object-cover" crossorigin="anonymous" />
                <UserCircleIcon v-else class="w-16 h-16 text-slate-400 bg-white" />
              </div>

              <!-- Name -->
              <div class="absolute z-10 w-full text-center flex justify-center" style="top: 310px;">
                <h2 class="text-[17px] font-black text-[#2e3440] uppercase tracking-wide truncate drop-shadow-sm" style="min-width: 180px;">
                  {{ viewingIdUser.firstName }} {{ viewingIdUser.lastName }}
                </h2>
              </div>

              <!-- Role -->
              <div class="absolute z-10 w-full text-center flex justify-center" style="top: 345px;">
                <p class="text-[13px] font-bold text-[#b91c1c] uppercase tracking-[0.1em]" style="min-width: 120px;">
                  {{ viewingIdUser.role || 'STUDENT' }}
                </p>
              </div>

              <!-- Barcode Canvas -->
              <div class="absolute z-10 flex justify-center items-center rounded-md px-2 py-1" style="width: 220px; height: 95px; left: 50%; top: 370px; transform: translateX(-50%);">
                <canvas ref="barcodeCanvas" class="w-[200px] h-[85px]"></canvas>
              </div>

              <!-- Institutional ID -->
              <div class="absolute z-10 w-full text-center flex justify-center" style="top: 475px;">
                <p class="text-[14px] font-bold text-[#3b4252] tracking-wider" style="min-width: 160px;">
                  {{ viewingIdUser.barcode }}
                </p>
              </div>


            </div>

            <button 
              @click="downloadId" 
              :disabled="isDownloadingId"
              class="btn-primary w-full justify-center max-w-[250px]"
            >
              <ArrowDownTrayIcon v-if="!isDownloadingId" class="w-5 h-5 mr-2" />
              <ArrowPathIcon v-else class="w-5 h-5 mr-2 animate-spin" />
              {{ isDownloadingId ? 'Downloading...' : 'Download ID' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
