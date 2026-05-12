<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import {
  UserPlusIcon, MagnifyingGlassIcon, PencilSquareIcon,
  TrashIcon, XMarkIcon, CheckIcon, FunnelIcon,
  UserCircleIcon,
} from '@heroicons/vue/24/outline'

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
  department: Department | null
  eligibilityStatus: string
  isActive: boolean
  createdAt: string
}

// ── State ─────────────────────────────────────────────────────────────────────
const users        = ref<UserRow[]>([])
const departments  = ref<Department[]>([])
const loading      = ref(false)
const searchQuery  = ref('')
const filterRole   = ref('')

// Modal
type ModalMode = 'create' | 'edit' | null
const modalMode    = ref<ModalMode>(null)
const saving       = ref(false)
const modalError   = ref('')
const editingId    = ref<number | null>(null)

const blankForm = () => ({
  firstName: '', lastName: '', middleName: '',
  email: '', password: 'Admin@1234',
  institutionalId: '', role: 'student',
  departmentId: '', eligibilityStatus: 'eligible', isActive: true,
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

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchUsers() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (searchQuery.value) params.search = searchQuery.value
    if (filterRole.value)  params.role   = filterRole.value
    const { data } = await api.get<UserRow[]>('/users', { params })
    users.value = data
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
  searchTimer = setTimeout(fetchUsers, 350)
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
    departmentId:    user.department?.id?.toString() ?? '',
    eligibilityStatus: user.eligibilityStatus,
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
      await api.post('/users', {
        ...form.value,
        departmentId: form.value.departmentId ? Number(form.value.departmentId) : undefined,
      })
    } else {
      const payload: Record<string, any> = {
        firstName:        form.value.firstName,
        lastName:         form.value.lastName,
        middleName:       form.value.middleName || undefined,
        email:            form.value.email,
        role:             form.value.role,
        departmentId:     form.value.departmentId ? Number(form.value.departmentId) : undefined,
        eligibilityStatus: form.value.eligibilityStatus,
        isActive:         form.value.isActive,
      }
      await api.patch(`/users/${editingId.value}`, payload)
    }
    closeModal()
    await fetchUsers()
  } catch (e: any) {
    modalError.value = e.response?.data?.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/users/${deleteTarget.value.id}`)
    deleteTarget.value = null
    await fetchUsers()
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
</script>

<template>
  <div class="max-w-6xl">

    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-[#447794]/10 flex items-center justify-center">
          <UserCircleIcon class="w-5 h-5 text-[#447794]" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-800">Manage Users</h2>
          <p class="text-xs text-slate-500">{{ users.length }} user{{ users.length !== 1 ? 's' : '' }} found</p>
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
        <select v-model="filterRole" @change="fetchUsers" class="input text-sm w-36">
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
          <option value="librarian">Librarian</option>
          <option value="admin">Admin</option>
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
              <th class="table-header px-4 py-3 text-left">Status</th>
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
              <!-- Active -->
              <td class="table-cell px-4">
                <span :class="user.isActive ? 'text-emerald-500' : 'text-slate-300'">
                  <CheckIcon v-if="user.isActive" class="w-4 h-4" />
                  <XMarkIcon v-else class="w-4 h-4" />
                </span>
              </td>
              <!-- Actions -->
              <td class="table-cell px-4">
                <div class="flex items-center justify-center gap-2">
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
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Department</label>
                <select v-model="form.departmentId" class="input">
                  <option value="">Select department...</option>
                  <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.code }} - {{ dept.name }}</option>
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

  </div>
</template>
