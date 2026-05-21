<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/useLibraryStore'
import { XMarkIcon, UserCircleIcon, KeyIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const authStore = useAuthStore()

const activeTab = ref<'profile' | 'password'>('profile')

const profileForm = ref({
  firstName: '',
  lastName: '',
  gender: '',
  profilePhotoUrl: '',
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const profileSuccess = ref('')
const passwordSuccess = ref('')
const passwordError = ref('')

// Watch for modal open to reset forms
watch(() => props.isOpen, (val) => {
  if (val && authStore.user) {
    profileForm.value = {
      firstName: authStore.user.firstName || '',
      lastName: authStore.user.lastName || '',
      gender: authStore.user.gender || '',
      profilePhotoUrl: authStore.user.profilePhotoUrl || '',
    }
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    profileSuccess.value = ''
    passwordSuccess.value = ''
    passwordError.value = ''
    activeTab.value = 'profile'
  }
})

async function handleProfileUpdate() {
  profileSuccess.value = ''
  try {
    await authStore.updateProfile(profileForm.value)
    profileSuccess.value = 'Profile updated successfully.'
  } catch (e: any) {
    // handled by store
  }
}

async function handlePasswordChange() {
  passwordError.value = ''
  passwordSuccess.value = ''
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = 'New passwords do not match.'
    return
  }
  if (passwordForm.value.newPassword.length < 6) {
    passwordError.value = 'Password must be at least 6 characters.'
    return
  }
  try {
    await authStore.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    })
    passwordSuccess.value = 'Password changed successfully.'
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (e: any) {
    passwordError.value = authStore.error || 'Failed to change password.'
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="emit('close')"></div>
    
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
      <!-- Header -->
      <div class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 class="text-lg font-bold text-slate-800">Account Settings</h2>
        <button @click="emit('close')" class="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <XMarkIcon class="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-slate-100 px-6 pt-4 gap-6 bg-slate-50">
        <button 
          @click="activeTab = 'profile'"
          :class="[
            'pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2',
            activeTab === 'profile' ? 'border-[#447794] text-[#447794]' : 'border-transparent text-slate-500 hover:text-slate-700'
          ]"
        >
          <UserCircleIcon class="w-5 h-5" />
          Profile Details
        </button>
        <button 
          @click="activeTab = 'password'"
          :class="[
            'pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2',
            activeTab === 'password' ? 'border-[#447794] text-[#447794]' : 'border-transparent text-slate-500 hover:text-slate-700'
          ]"
        >
          <KeyIcon class="w-5 h-5" />
          Change Password
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Profile Tab -->
        <div v-if="activeTab === 'profile'" class="space-y-4">
          <div v-if="profileSuccess" class="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg font-medium">
            {{ profileSuccess }}
          </div>
          <div v-if="authStore.error && !profileSuccess" class="p-3 bg-rose-50 text-rose-700 text-sm rounded-lg font-medium">
            {{ authStore.error }}
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">First Name</label>
              <input v-model="profileForm.firstName" type="text" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#447794] focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Last Name</label>
              <input v-model="profileForm.lastName" type="text" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#447794] focus:border-transparent outline-none transition-all" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
            <select v-model="profileForm.gender" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#447794] focus:border-transparent outline-none transition-all">
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Profile Photo URL</label>
            <input v-model="profileForm.profilePhotoUrl" type="text" placeholder="https://..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#447794] focus:border-transparent outline-none transition-all" />
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button @click="emit('close')" class="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button @click="handleProfileUpdate" :disabled="authStore.loading" class="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#123249] to-[#447794] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
              <span v-if="authStore.loading">Saving...</span>
              <span v-else>Save Changes</span>
            </button>
          </div>
        </div>

        <!-- Password Tab -->
        <div v-if="activeTab === 'password'" class="space-y-4">
          <div v-if="passwordSuccess" class="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg font-medium">
            {{ passwordSuccess }}
          </div>
          <div v-if="passwordError" class="p-3 bg-rose-50 text-rose-700 text-sm rounded-lg font-medium">
            {{ passwordError }}
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Password</label>
            <input v-model="passwordForm.currentPassword" type="password" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#447794] focus:border-transparent outline-none transition-all" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">New Password</label>
            <input v-model="passwordForm.newPassword" type="password" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#447794] focus:border-transparent outline-none transition-all" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Confirm New Password</label>
            <input v-model="passwordForm.confirmPassword" type="password" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#447794] focus:border-transparent outline-none transition-all" />
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button @click="emit('close')" class="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button @click="handlePasswordChange" :disabled="authStore.loading" class="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#123249] to-[#447794] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
              <span v-if="authStore.loading">Updating...</span>
              <span v-else>Update Password</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
