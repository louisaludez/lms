<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { UserPlusIcon } from '@heroicons/vue/24/outline'

const form = ref({
  email: '',
  password: 'Admin@1234', // Default password
  firstName: '',
  lastName: '',
  role: 'student',
  institutionalId: '',
  departmentId: ''
})

const departments = ref<any[]>([])
const loading = ref(false)
const success = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get('/users/departments')
    departments.value = data
  } catch (e) {
    console.error(e)
  }
})

async function submit() {
  loading.value = true
  success.value = false
  errorMsg.value = ''
  try {
    await api.post('/users', {
      ...form.value,
      departmentId: Number(form.value.departmentId)
    })
    success.value = true
    form.value = {
      email: '', password: 'Admin@1234', firstName: '', lastName: '',
      role: 'student', institutionalId: '', departmentId: ''
    }
  } catch (e: any) {
    errorMsg.value = e.response?.data?.message || 'Failed to create account'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="card p-6">
      <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div class="w-10 h-10 rounded-xl bg-[#447794]/10 flex items-center justify-center">
          <UserPlusIcon class="w-5 h-5 text-[#447794]" />
        </div>
        <h2 class="font-semibold text-slate-800">Create User Account</h2>
      </div>

      <form @submit.prevent="submit" class="space-y-4">
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
            <input v-model="form.institutionalId" type="text" required class="input font-mono" placeholder="e.g. 2024-CCS-001" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Role *</label>
            <select v-model="form.role" required class="input">
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="librarian">Librarian</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Department *</label>
            <select v-model="form.departmentId" required class="input">
              <option value="" disabled>Select a department...</option>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.code }} - {{ dept.name }}</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Default Password</label>
            <input v-model="form.password" type="text" class="input font-mono bg-slate-50 text-slate-500" disabled />
            <p class="text-[10px] text-slate-400 mt-1">Users can change this later.</p>
          </div>
        </div>

        <button type="submit" :disabled="loading" class="btn-primary w-full justify-center mt-6">
          <UserPlusIcon v-if="!loading" class="w-5 h-5" />
          {{ loading ? 'Saving...' : 'Create Account' }}
        </button>

        <div v-if="errorMsg" class="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm mt-4">{{ errorMsg }}</div>
        <div v-if="success" class="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm mt-4 font-medium">✅ User account created successfully! Their digital ID barcode has been automatically generated.</div>
      </form>
    </div>
  </div>
</template>
