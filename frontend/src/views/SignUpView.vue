<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/useLibraryStore'
import { BookOpenIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import ndcLogo from '@/assets/ndc_logo.png'

const auth = useAuthStore()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const institutionalId = ref('')
const role = ref<'student' | 'faculty' | 'librarian'>('student')
const password = ref('')
const confirmPassword = ref('')
const gender = ref('Male')
const departmentId = ref('')
const departments = ref<{id: number; name: string; code: string}[]>([])
const showPassword = ref(false)
const clientMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const displayPicture = ref<File | null>(null)
const displayPicturePreview = ref<string | null>(null)

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    if (!file.type.startsWith('image/')) {
      clientMessage.value = 'Please select a valid image file.'
      target.value = ''
      displayPicture.value = null
      displayPicturePreview.value = null
      return
    }
    clientMessage.value = null
    displayPicture.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      displayPicturePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  } else {
    displayPicture.value = null
    displayPicturePreview.value = null
  }
}

import api from '@/api/axios'
import { onMounted } from 'vue'

onMounted(async () => {
  try {
    const { data } = await api.get('/auth/departments')
    departments.value = data
  } catch (e) {
    // If it fails (e.g., unauthorized), it will just be empty
    console.error('Failed to load departments', e)
  }
})

async function handleSignUp() {
  clientMessage.value = null
  if (password.value !== confirmPassword.value) {
    clientMessage.value = 'Passwords do not match.'
    return
  }
  if (password.value.length < 8) {
    clientMessage.value = 'Password must be at least 8 characters.'
    return
  }
  if (!displayPicture.value) {
    clientMessage.value = 'Please select a display picture.'
    return
  }
  if (!departmentId.value) {
    clientMessage.value = 'Please select a department.'
    return
  }
  try {
    successMessage.value = await auth.register({
      email: email.value.trim(),
      password: password.value,
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      institutionalId: institutionalId.value.trim(),
      role: role.value,
      gender: gender.value,
      departmentId: departmentId.value ? Number(departmentId.value) : undefined,
      displayPicture: displayPicture.value,
    })
  } catch { /* error shown via auth.error */ }
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-[#061222] flex items-center justify-center p-4 py-10">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#447794]/10 blur-3xl" />
      <div class="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#2D5B75]/10 blur-3xl" />
    </div>

    <div class="relative w-full max-w-lg">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-28 h-28 mb-4">
          <img :src="ndcLogo" class="w-full h-full object-contain drop-shadow-xl" alt="NDC Logo" />
        </div>
        <h1 class="text-3xl font-bold text-white">Lumina</h1>
        <p class="text-[#80b3ce] text-sm mt-1">Library Management System</p>
      </div>

      <div class="bg-[#0e2236] rounded-3xl p-8 shadow-2xl border border-[#447794]/20">
        <template v-if="successMessage">
          <h2 class="text-xl font-semibold text-white mb-2">Request submitted</h2>
          <div class="mb-6 p-4 rounded-xl bg-emerald-900/30 border border-emerald-700/40 text-emerald-200 text-sm">
            {{ successMessage }}
          </div>
          <p class="text-[#80b3ce] text-sm mb-6">
            Your library barcode will be assigned when a librarian approves your account. You can sign in after approval.
          </p>
          <router-link to="/login" class="btn-primary w-full justify-center py-3 text-base">
            Go to sign in
          </router-link>
        </template>

        <template v-else>
          <h2 class="text-xl font-semibold text-white mb-2">Create your account</h2>
          <p class="text-[#80b3ce] text-sm mb-7">
            Register as a student or faculty member. A librarian must approve your account before you can sign in.
          </p>

          <div
            v-if="clientMessage || auth.error"
            class="mb-5 p-4 rounded-xl bg-rose-900/30 border border-rose-700/40 text-rose-300 text-sm"
          >
            {{ clientMessage || auth.error }}
          </div>

          <form @submit.prevent="handleSignUp" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-[#80b3ce] mb-2 uppercase tracking-wider">I am a</label>
              <div class="grid grid-cols-3 gap-3">
                <label
                  class="flex items-center justify-center py-3 rounded-xl border cursor-pointer transition-colors text-sm font-semibold"
                  :class="role === 'student'
                    ? 'bg-[#447794]/20 border-[#447794] text-white'
                    : 'bg-[#123249] border-[#447794]/30 text-[#80b3ce] hover:border-[#447794]/50'"
                >
                  <input v-model="role" type="radio" value="student" class="sr-only" />
                  Student
                </label>
                <label
                  class="flex items-center justify-center py-3 rounded-xl border cursor-pointer transition-colors text-sm font-semibold"
                  :class="role === 'faculty'
                    ? 'bg-[#447794]/20 border-[#447794] text-white'
                    : 'bg-[#123249] border-[#447794]/30 text-[#80b3ce] hover:border-[#447794]/50'"
                >
                  <input v-model="role" type="radio" value="faculty" class="sr-only" />
                  Faculty
                </label>
                <label
                  class="flex items-center justify-center py-3 rounded-xl border cursor-pointer transition-colors text-sm font-semibold"
                  :class="role === 'librarian'
                    ? 'bg-[#447794]/20 border-[#447794] text-white'
                    : 'bg-[#123249] border-[#447794]/30 text-[#80b3ce] hover:border-[#447794]/50'"
                >
                  <input v-model="role" type="radio" value="librarian" class="sr-only" />
                  Librarian
                </label>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">Display Picture</label>
              <div class="flex items-center gap-4">
                <div v-if="displayPicturePreview" class="w-16 h-16 rounded-full overflow-hidden border-2 border-[#447794] flex-shrink-0">
                  <img :src="displayPicturePreview" alt="Preview" class="w-full h-full object-cover" />
                </div>
                <div v-else class="w-16 h-16 rounded-full bg-[#123249] border border-[#447794]/30 flex items-center justify-center text-[#80b3ce] flex-shrink-0">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="signup-picture"
                  type="file"
                  accept="image/*"
                  required
                  @change="handleFileChange"
                  class="block w-full text-sm text-[#80b3ce] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#447794]/20 file:text-[#80b3ce] hover:file:bg-[#447794]/40 transition-colors cursor-pointer"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="signup-first" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">First name</label>
                <input
                  id="signup-first"
                  v-model="firstName"
                  type="text"
                  required
                  autocomplete="given-name"
                  class="input bg-[#123249] border-[#447794]/30 text-white placeholder:text-slate-500 focus:ring-[#447794]/40 focus:border-[#447794]"
                />
              </div>
              <div>
                <label for="signup-last" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">Last name</label>
                <input
                  id="signup-last"
                  v-model="lastName"
                  type="text"
                  required
                  autocomplete="family-name"
                  class="input bg-[#123249] border-[#447794]/30 text-white placeholder:text-slate-500 focus:ring-[#447794]/40 focus:border-[#447794]"
                />
              </div>
            </div>

            <div>
              <label for="signup-email" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">Email address</label>
              <input
                id="signup-email"
                v-model="email"
                type="email"
                required
                autocomplete="email"
                placeholder="you@school.edu.ph"
                class="input bg-[#123249] border-[#447794]/30 text-white placeholder:text-slate-500 focus:ring-[#447794]/40 focus:border-[#447794]"
              />
            </div>

            <div>
              <label for="signup-inst-id" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">
                {{ role === 'student' ? 'Student ID' : role === 'faculty' ? 'Faculty ID' : 'Employee ID' }}
              </label>
              <input
                id="signup-inst-id"
                v-model="institutionalId"
                type="text"
                required
                autocomplete="username"
                placeholder="e.g. 2024-00123"
                class="input bg-[#123249] border-[#447794]/30 text-white placeholder:text-slate-500 focus:ring-[#447794]/40 focus:border-[#447794]"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="signup-gender" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">Gender</label>
                <select
                  id="signup-gender"
                  v-model="gender"
                  required
                  class="input bg-[#123249] border-[#447794]/30 text-white placeholder:text-slate-500 focus:ring-[#447794]/40 focus:border-[#447794]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label for="signup-department" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">Department</label>
                <select
                  id="signup-department"
                  v-model="departmentId"
                  required
                  class="input bg-[#123249] border-[#447794]/30 text-white placeholder:text-slate-500 focus:ring-[#447794]/40 focus:border-[#447794]"
                >
                  <option value="" disabled>Select Department</option>
                  <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                    {{ dept.code }} - {{ dept.name }}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label for="signup-password" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">Password</label>
              <div class="relative">
                <input
                  id="signup-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  minlength="8"
                  autocomplete="new-password"
                  placeholder="At least 8 characters"
                  class="input bg-[#123249] border-[#447794]/30 text-white placeholder:text-slate-500 focus:ring-[#447794]/40 focus:border-[#447794] pr-12"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <EyeSlashIcon v-if="showPassword" class="w-5 h-5" />
                  <EyeIcon v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label for="signup-confirm" class="block text-xs font-semibold text-[#80b3ce] mb-1.5 uppercase tracking-wider">Confirm password</label>
              <input
                id="signup-confirm"
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="8"
                autocomplete="new-password"
                placeholder="Repeat password"
                class="input bg-[#123249] border-[#447794]/30 text-white placeholder:text-slate-500 focus:ring-[#447794]/40 focus:border-[#447794]"
              />
            </div>

            <button
              type="submit"
              :disabled="auth.loading"
              class="btn-primary w-full justify-center py-3 text-base mt-2"
            >
              <svg v-if="auth.loading" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ auth.loading ? 'Submitting...' : 'Submit for approval' }}
            </button>
          </form>

          <p class="text-center text-sm text-[#80b3ce] mt-6">
            Already have an account?
            <router-link to="/login" class="text-[#447794] hover:text-[#80b3ce] font-semibold transition-colors">
              Sign in
            </router-link>
          </p>
        </template>
      </div>
    </div>
  </div>
</template>