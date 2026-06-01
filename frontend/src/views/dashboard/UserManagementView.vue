<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import {
  UserPlusIcon, MagnifyingGlassIcon, PencilSquareIcon,
  TrashIcon, XMarkIcon, CheckIcon, FunnelIcon,
  UserCircleIcon, HandThumbUpIcon, HandThumbDownIcon,
  QrCodeIcon, ArrowDownTrayIcon, ArrowPathIcon,
} from '@heroicons/vue/24/outline'
import JsBarcode from 'jsbarcode'
import { toPng } from 'html-to-image'
import Pagination from '@/components/Pagination.vue'

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
    const params: Record<string, string | number> = { page, limit: currentLimit.value }
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
  <div class="max-w-full">

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

    <!-- Filters -->
    <div class="flex gap-3 mb-4">
      <div class="relative flex-1 max-w-sm">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          v-model="searchQuery"
          @input="onSearch"
          type="search"
          placeholder="Search name, email, ID..."
          class="input pl-9 text-sm"
        />
      </div>
      <div class="flex items-center gap-2">
        <FunnelIcon class="w-4 h-4 text-slate-400" />
        <select v-model="filterRole" @change="fetchUsers(1)" class="input text-sm w-36">
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
          <option value="librarian">Librarian</option>
          <option value="admin">Admin</option>
        </select>
        <select v-model="filterApprovalStatus" @change="fetchUsers(1)" class="input text-sm w-40">
          <option value="">All approvals</option>
          <option value="pending">Pending approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
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
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="table-header px-4 py-3 text-left">User</th>
              <th class="table-header px-4 py-3 text-left">ID / Barcode</th>
              <th class="table-header px-4 py-3 text-left">Role</th>
              <th class="table-header px-4 py-3 text-left">Department</th>
              <th class="table-header px-4 py-3 text-left">Eligibility</th>
              <th class="table-header px-4 py-3 text-left">Approval</th>
              <th class="table-header px-4 py-3 text-left">Active</th>
              <th class="table-header px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in users"
              :key="user.id"
              class="table-row"
            >
              <!-- User -->
              <td class="table-cell px-4">
                <p class="font-semibold text-slate-800 text-sm">{{ user.firstName }} {{ user.lastName }}</p>
                <p class="text-xs text-slate-400">{{ user.email }}</p>
              </td>
              <!-- ID -->
              <td class="table-cell px-4">
                <p class="font-mono text-xs text-slate-700">{{ user.institutionalId }}</p>
                <p class="font-mono text-xs text-slate-400">{{ user.barcode }}</p>
              </td>
              <!-- Role -->
              <td class="table-cell px-4">
                <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold capitalize', roleBadge(user.role)]">
                  {{ user.role }}
                </span>
              </td>
              <!-- Department -->
              <td class="table-cell px-4 text-sm text-slate-600">
                {{ user.department?.code ?? '—' }}
              </td>
              <!-- Eligibility -->
              <td class="table-cell px-4">
                <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold capitalize', eligBadge(user.eligibilityStatus)]">
                  {{ user.eligibilityStatus }}
                </span>
              </td>
              <!-- Account approval -->
              <td class="table-cell px-4">
                <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold capitalize', approvalBadge(user.accountApprovalStatus)]">
                  {{ user.accountApprovalStatus }}
                </span>
              </td>
              <!-- Active -->
              <td class="table-cell px-4">
                <span :class="user.isActive ? 'text-emerald-500' : 'text-slate-300'">
                  <CheckIcon v-if="user.isActive" class="w-4 h-4" />
                  <XMarkIcon v-else class="w-4 h-4" />
                </span>
              </td>
              <!-- Actions -->
              <td class="table-cell px-4">
                <div class="flex items-center justify-center gap-2 flex-wrap">
                  <template v-if="user.accountApprovalStatus === 'pending'">
                    <button
                      type="button"
                      :disabled="reviewingId === user.id"
                      @click="setApprovalStatus(user.id, 'approved')"
                      class="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                      title="Approve account"
                    >
                      <HandThumbUpIcon class="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      :disabled="reviewingId === user.id"
                      @click="setApprovalStatus(user.id, 'rejected')"
                      class="p-1.5 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors disabled:opacity-50"
                      title="Reject account"
                    >
                      <HandThumbDownIcon class="w-4 h-4" />
                    </button>
                  </template>
                  <button
                    v-if="user.role === 'student' || user.role === 'faculty'"
                    @click="viewingIdUser = user"
                    class="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                    title="View Digital ID"
                  >
                    <QrCodeIcon class="w-4 h-4" />
                  </button>
                  <button
                    @click="openEdit(user)"
                    class="p-1.5 rounded-lg bg-[#447794]/10 text-[#447794] hover:bg-[#447794]/20 transition-colors"
                    title="Edit"
                  >
                    <PencilSquareIcon class="w-4 h-4" />
                  </button>
                  <button
                    @click="deleteTarget = user"
                    class="p-1.5 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                    title="Deactivate"
                  >
                    <TrashIcon class="w-4 h-4" />
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
                  <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.code }} - {{ dept.name }}</option>
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
              style="width: 250px; aspect-ratio: 591 / 1004;"
            >
              <!-- Background Template -->
              <img src="@/assets/id.png" class="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" alt="ID Template" crossorigin="anonymous" />
              
              <!-- Automated ID Header -->
              <div class="absolute z-10 w-full text-center px-4 flex flex-col justify-center" style="top: 25%; height: 5%;">
                <h3 class="text-[12px] font-black text-rose-600 uppercase tracking-widest drop-shadow-sm">AUTOMATED ID</h3>
              </div>

              <!-- User Photo -->
              <div class="absolute z-10 overflow-hidden bg-slate-200 flex items-center justify-center" style="left: 36%; right: 36%; top: 31%; bottom: 49%; border-radius: 8px;">
                <img v-if="viewingIdUser.profilePhotoUrl" :src="viewingIdUser.profilePhotoUrl" class="w-full h-full object-cover" crossorigin="anonymous" />
                <UserCircleIcon v-else class="w-12 h-12 text-slate-400 bg-white" />
              </div>

              <!-- Name -->
              <div class="absolute z-10 w-full text-center px-4 flex flex-col justify-center" style="top: 52%; height: 5%;">
                <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide truncate">
                  {{ viewingIdUser.firstName }} {{ viewingIdUser.lastName }}
                </h2>
              </div>

              <!-- Role -->
              <div class="absolute z-10 w-full text-center px-4 flex flex-col justify-center" style="top: 57%; height: 3%;">
                <p class="text-[10px] font-bold text-[#8c1c1c] uppercase tracking-widest truncate">
                  {{ viewingIdUser.role || 'STUDENT' }}
                </p>
              </div>

              <!-- Barcode Canvas -->
              <div class="absolute z-10 w-full flex justify-center items-center" style="top: 61%; height: 10%;">
                <canvas ref="barcodeCanvas" class="w-[140px] h-[40px]"></canvas>
              </div>

              <!-- Institutional ID -->
              <div class="absolute z-10 w-full text-center flex flex-col justify-center" style="top: 71%; height: 4%;">
                <p class="text-[11px] font-semibold text-slate-800 uppercase tracking-wider">
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
