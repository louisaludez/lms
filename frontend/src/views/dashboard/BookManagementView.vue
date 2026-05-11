<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import { BookOpenIcon, PlusIcon } from '@heroicons/vue/24/outline'

const form = ref({
  isbn: '',
  callNumber: '',
  title: '',
  edition: '',
  publisher: '',
  publishYear: new Date().getFullYear(),
  categoryId: '',
  language: 'English',
  description: '',
  totalCopies: 1,
  locationShelf: '',
  isReferenceOnly: false,
})

const categories = ref<any[]>([])
const loading = ref(false)
const success = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get('/books/categories')
    categories.value = data
  } catch (e) {
    console.error(e)
  }
})

async function submit() {
  loading.value = true
  success.value = false
  errorMsg.value = ''
  try {
    await api.post('/books', {
      ...form.value,
      categoryId: Number(form.value.categoryId)
    })
    success.value = true
    form.value = {
      isbn: '', callNumber: '', title: '', edition: '', publisher: '',
      publishYear: new Date().getFullYear(), categoryId: '', language: 'English',
      description: '', totalCopies: 1, locationShelf: '', isReferenceOnly: false
    }
  } catch (e: any) {
    errorMsg.value = e.response?.data?.message || 'Failed to add book'
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
          <BookOpenIcon class="w-5 h-5 text-[#447794]" />
        </div>
        <h2 class="font-semibold text-slate-800">Add New Book to Catalog</h2>
      </div>

      <form @submit.prevent="submit" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Title *</label>
            <input v-model="form.title" type="text" required class="input" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">ISBN *</label>
            <input v-model="form.isbn" type="text" required class="input" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Call Number *</label>
            <input v-model="form.callNumber" type="text" required class="input font-mono" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Category *</label>
            <select v-model="form.categoryId" required class="input">
              <option value="" disabled>Select a category...</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Publisher</label>
            <input v-model="form.publisher" type="text" class="input" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Publish Year</label>
            <input v-model="form.publishYear" type="number" class="input" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Edition</label>
            <input v-model="form.edition" type="text" class="input" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Language</label>
            <input v-model="form.language" type="text" class="input" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Location / Shelf</label>
            <input v-model="form.locationShelf" type="text" class="input" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Total Physical Copies *</label>
            <input v-model="form.totalCopies" type="number" min="1" required class="input" />
            <p class="text-[10px] text-slate-400 mt-1">Barcodes will be automatically generated.</p>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Description</label>
          <textarea v-model="form.description" rows="3" class="input"></textarea>
        </div>

        <div class="flex items-center gap-2">
          <input type="checkbox" id="refOnly" v-model="form.isReferenceOnly" class="rounded border-slate-300 text-[#447794] focus:ring-[#447794]" />
          <label for="refOnly" class="text-sm font-medium text-slate-700">Reference Only (Cannot be borrowed)</label>
        </div>

        <button type="submit" :disabled="loading" class="btn-primary w-full justify-center mt-6">
          <PlusIcon v-if="!loading" class="w-5 h-5" />
          {{ loading ? 'Saving...' : 'Add Book to Catalog' }}
        </button>

        <div v-if="errorMsg" class="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm mt-4">{{ errorMsg }}</div>
        <div v-if="success" class="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm mt-4 font-medium">✅ Book successfully added and physical copy barcodes generated!</div>
      </form>
    </div>
  </div>
</template>
