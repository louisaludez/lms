<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/axios'
import {
  BookOpenIcon, PlusIcon, MagnifyingGlassIcon,
  PencilSquareIcon, TrashIcon, XMarkIcon,
  CheckIcon, FunnelIcon,
} from '@heroicons/vue/24/outline'
import Pagination from '@/components/Pagination.vue'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Category { id: number; name: string }
interface BookRow {
  id: number
  isbn: string
  callNumber: string
  title: string
  authors: string[]
  edition: string | null
  publisher: string | null
  publishYear: number | null
  category: Category | null
  language: string
  availableCopies: number
  totalCopies: number
  locationShelf: string | null
  isReferenceOnly: boolean
  isActive: boolean
  coverImageUrl: string | null
}

// ── State ─────────────────────────────────────────────────────────────────────
const books       = ref<BookRow[]>([])
const categories  = ref<Category[]>([])
const loading     = ref(false)
const searchQuery = ref('')
const filterCat   = ref('')

type ModalMode = 'create' | 'edit' | null
const modalMode  = ref<ModalMode>(null)
const saving     = ref(false)
const modalError = ref('')
const editingId  = ref<number | null>(null)

const blankForm = () => ({
  title: '', isbn: '', callNumber: '', edition: '',
  publisher: '', publishYear: new Date().getFullYear(),
  categoryId: '', language: 'English', description: '',
  coverImageUrl: '', locationShelf: '', totalCopies: 1,
  isReferenceOnly: false, isActive: true,
})
const form = ref(blankForm())

const deleteTarget = ref<BookRow | null>(null)
const deleting     = ref(false)

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  fetchBooks()
  api.get<Category[]>('/books/categories').then(r => { categories.value = r.data })
})

const currentPage = ref(1)
const lastPage    = ref(1)
const totalItems  = ref(0)
const currentLimit = ref(10)

// ── Data ──────────────────────────────────────────────────────────────────────
async function fetchBooks(page = 1) {
  loading.value = true
  try {
    const params: Record<string, string | number> = { page, limit: currentLimit.value }
    if (searchQuery.value) params.search     = searchQuery.value
    if (filterCat.value)   params.categoryId = filterCat.value
    const { data } = await api.get<{ data: BookRow[], total: number, page: number, lastPage: number }>('/books/all', { params })
    books.value = data.data
    currentPage.value = data.page
    lastPage.value = data.lastPage
    totalItems.value = data.total
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(() => fetchBooks(1), 350)
}

function onLimitChange(newLimit: number) {
  currentLimit.value = newLimit
  fetchBooks(1)
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function openCreate() {
  form.value     = blankForm()
  editingId.value = null
  modalError.value = ''
  modalMode.value  = 'create'
}

function openEdit(book: BookRow) {
  form.value = {
    title:          book.title,
    isbn:           book.isbn,
    callNumber:     book.callNumber,
    edition:        book.edition ?? '',
    publisher:      book.publisher ?? '',
    publishYear:    book.publishYear ?? new Date().getFullYear(),
    categoryId:     book.category?.id?.toString() ?? '',
    language:       book.language,
    description:    '',
    coverImageUrl:  book.coverImageUrl ?? '',
    locationShelf:  book.locationShelf ?? '',
    totalCopies:    book.totalCopies,
    isReferenceOnly: book.isReferenceOnly,
    isActive:       book.isActive,
  }
  editingId.value  = book.id
  modalError.value = ''
  modalMode.value  = 'edit'
}

function closeModal() { modalMode.value = null; modalError.value = '' }

// ── CRUD ──────────────────────────────────────────────────────────────────────
async function saveBook() {
  saving.value     = true
  modalError.value = ''
  try {
    if (modalMode.value === 'create') {
      const { isActive, ...createPayload } = form.value
      await api.post('/books', {
        ...createPayload,
        categoryId:  createPayload.categoryId  ? Number(createPayload.categoryId)  : undefined,
        publishYear: createPayload.publishYear ? Number(createPayload.publishYear) : undefined,
      })
    } else {
      await api.patch(`/books/${editingId.value}`, {
        title:          form.value.title        || undefined,
        isbn:           form.value.isbn         || undefined,
        callNumber:     form.value.callNumber   || undefined,
        edition:        form.value.edition      || undefined,
        publisher:      form.value.publisher    || undefined,
        publishYear:    form.value.publishYear  ? Number(form.value.publishYear) : undefined,
        categoryId:     form.value.categoryId   ? Number(form.value.categoryId)  : undefined,
        language:       form.value.language     || undefined,
        coverImageUrl:  form.value.coverImageUrl || undefined,
        locationShelf:  form.value.locationShelf || undefined,
        isReferenceOnly: form.value.isReferenceOnly,
        isActive:       form.value.isActive,
      })
    }
    closeModal()
    await fetchBooks(currentPage.value)
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
    await api.delete(`/books/${deleteTarget.value.id}`)
    deleteTarget.value = null
    await fetchBooks(currentPage.value)
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Delete failed')
  } finally {
    deleting.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function availBadge(available: number, total: number) {
  if (available === 0) return 'bg-rose-100 text-rose-700'
  if (available < total) return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}
</script>

<template>
  <div class="max-w-full">

    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-[#447794]/10 flex items-center justify-center">
          <BookOpenIcon class="w-5 h-5 text-[#447794]" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-800">Manage Books</h2>
          <p class="text-xs text-slate-500">{{ totalItems }} title{{ totalItems !== 1 ? 's' : '' }} in catalog</p>
        </div>
      </div>
      <button @click="openCreate" class="btn-primary">
        <PlusIcon class="w-4 h-4" /> Add Book
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
          placeholder="Search title, ISBN, call number..."
          class="input pl-9 text-sm"
        />
      </div>
      <div class="flex items-center gap-2">
        <FunnelIcon class="w-4 h-4 text-slate-400" />
        <select v-model="filterCat" @change="fetchBooks(1)" class="input text-sm w-44">
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="p-4 space-y-3">
        <div v-for="i in 6" :key="i" class="skeleton h-12 rounded-xl" />
      </div>

      <div v-else-if="books.length === 0" class="py-16 text-center text-slate-400">
        <BookOpenIcon class="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p class="font-medium text-slate-500">No books found</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="table-header px-4 py-3 text-left">Title / Author</th>
              <th class="table-header px-4 py-3 text-left">ISBN / Call No.</th>
              <th class="table-header px-4 py-3 text-left">Category</th>
              <th class="table-header px-4 py-3 text-left">Copies</th>
              <th class="table-header px-4 py-3 text-left">Shelf</th>
              <th class="table-header px-4 py-3 text-left">Flags</th>
              <th class="table-header px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="book in books"
              :key="book.id"
              :class="['table-row', !book.isActive && 'opacity-50']"
            >
              <!-- Title -->
              <td class="table-cell px-4 max-w-[240px]">
                <p class="font-semibold text-slate-800 text-sm truncate">{{ book.title }}</p>
                <p v-if="book.authors?.length" class="text-xs text-slate-400 truncate">{{ book.authors.join(', ') }}</p>
                <p v-else class="text-xs text-slate-300 italic">No authors</p>
              </td>
              <!-- ISBN -->
              <td class="table-cell px-4">
                <p class="font-mono text-xs text-slate-700">{{ book.isbn }}</p>
                <p class="font-mono text-xs text-slate-400">{{ book.callNumber }}</p>
              </td>
              <!-- Category -->
              <td class="table-cell px-4 text-sm text-slate-600">{{ book.category?.name ?? '—' }}</td>
              <!-- Copies -->
              <td class="table-cell px-4">
                <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold', availBadge(book.availableCopies, book.totalCopies)]">
                  {{ book.availableCopies }} / {{ book.totalCopies }}
                </span>
              </td>
              <!-- Shelf -->
              <td class="table-cell px-4 text-sm text-slate-500">{{ book.locationShelf ?? '—' }}</td>
              <!-- Flags -->
              <td class="table-cell px-4">
                <div class="flex gap-1 flex-wrap">
                  <span v-if="book.isReferenceOnly" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">REF</span>
                  <span v-if="!book.isActive" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">INACTIVE</span>
                  <span v-if="book.isActive && !book.isReferenceOnly" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">ACTIVE</span>
                </div>
              </td>
              <!-- Actions -->
              <td class="table-cell px-4">
                <div class="flex items-center justify-center gap-2">
                  <button
                    @click="openEdit(book)"
                    class="p-1.5 rounded-lg bg-[#447794]/10 text-[#447794] hover:bg-[#447794]/20 transition-colors"
                    title="Edit"
                  >
                    <PencilSquareIcon class="w-4 h-4" />
                  </button>
                  <button
                    @click="deleteTarget = book"
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
        @update:page="fetchBooks"
        @update:limit="onLimitChange"
      />
    </div>

    <!-- Create / Edit Modal -->
    <Teleport to="body">
      <div v-if="modalMode" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h3 class="font-bold text-slate-800 flex items-center gap-2">
              <BookOpenIcon class="w-5 h-5 text-[#447794]" />
              {{ modalMode === 'create' ? 'Add New Book' : 'Edit Book' }}
            </h3>
            <button @click="closeModal" class="text-slate-400 hover:text-slate-600">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="saveBook" class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Title *</label>
                <input v-model="form.title" type="text" required class="input" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">ISBN *</label>
                <input v-model="form.isbn" type="text" :required="modalMode === 'create'" :disabled="modalMode === 'edit'" class="input font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Call Number *</label>
                <input v-model="form.callNumber" type="text" required class="input font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Category</label>
                <select v-model="form.categoryId" class="input">
                  <option value="">Select category...</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Language</label>
                <input v-model="form.language" type="text" class="input" />
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
                <input v-model="form.edition" type="text" class="input" placeholder="e.g. 3rd" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Location / Shelf</label>
                <input v-model="form.locationShelf" type="text" class="input" placeholder="e.g. Section A Row 3" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Cover Image URL</label>
                <input v-model="form.coverImageUrl" type="url" class="input" placeholder="https://..." />
              </div>
              <div v-if="modalMode === 'create'">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Total Copies *</label>
                <input v-model="form.totalCopies" type="number" min="1" required class="input" />
                <p class="text-[10px] text-slate-400 mt-1">Barcodes auto-generated.</p>
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Description</label>
                <textarea v-model="form.description" rows="3" class="input resize-none" />
              </div>
              <div class="flex items-center gap-3">
                <input v-model="form.isReferenceOnly" type="checkbox" id="refOnly" class="w-4 h-4 accent-[#447794]" />
                <label for="refOnly" class="text-sm font-medium text-slate-700">Reference Only</label>
              </div>
              <div v-if="modalMode === 'edit'" class="flex items-center gap-3">
                <input v-model="form.isActive" type="checkbox" id="isActive" class="w-4 h-4 accent-[#447794]" />
                <label for="isActive" class="text-sm font-medium text-slate-700">Active in Catalog</label>
              </div>
            </div>

            <div v-if="modalError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {{ modalError }}
            </div>

            <div class="flex gap-3 pt-2">
              <button type="button" @click="closeModal" class="btn-ghost flex-1 justify-center">Cancel</button>
              <button type="submit" :disabled="saving" class="btn-primary flex-1 justify-center">
                {{ saving ? 'Saving...' : modalMode === 'create' ? 'Add Book' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirm -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
          <div class="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <TrashIcon class="w-6 h-6 text-rose-600" />
          </div>
          <h3 class="font-bold text-slate-800 text-center mb-1">Remove from Catalog</h3>
          <p class="text-sm text-slate-500 text-center mb-5">
            Are you sure you want to deactivate
            <strong class="text-slate-700">{{ deleteTarget.title }}</strong>?
            It will be hidden from the OPAC.
          </p>
          <div class="flex gap-3">
            <button @click="deleteTarget = null" class="btn-ghost flex-1 justify-center">Cancel</button>
            <button
              @click="confirmDelete"
              :disabled="deleting"
              class="flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-all"
            >
              {{ deleting ? 'Removing...' : 'Deactivate' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
