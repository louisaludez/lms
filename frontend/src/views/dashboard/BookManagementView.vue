<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import {
  BookOpenIcon, PlusIcon, MagnifyingGlassIcon,
  PencilSquareIcon, TrashIcon, XMarkIcon,
  CheckIcon, FunnelIcon, ArrowsUpDownIcon,
  ArrowUpTrayIcon, DocumentArrowDownIcon
} from '@heroicons/vue/24/outline'
import Pagination from '@/components/Pagination.vue'
import DropdownFilter from '@/components/DropdownFilter.vue'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Category { id: number; name: string }
interface BookCopyRow {
  id: number
  barcode: string
  condition: string
  isActive: boolean
}
interface BookRow {
  id: number
  isbn: string
  callNumber: string
  title: string
  otherTitle: string | null
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
  itemType: string
  issn: string | null
  copies?: BookCopyRow[]
}

// ── State ─────────────────────────────────────────────────────────────────────
const books       = ref<BookRow[]>([])
const categories  = ref<Category[]>([])
const loading     = ref(false)
const searchQuery = ref('')
const filterCat   = ref('')
const sortBy      = ref('createdAt')
const sortOrder   = ref<'ASC'|'DESC'>('DESC')

const sortOptions = [
  { label: 'Recently Added', value: 'createdAt' },
  { label: 'Title (A-Z)', value: 'title' },
  { label: 'Available Copies', value: 'copies' }
]

const categoryOptions = computed(() => {
  return [
    { label: 'All Categories', value: '' },
    ...categories.value.map(c => ({ label: c.name, value: c.id }))
  ]
})

type ModalMode = 'create' | 'edit' | null
const modalMode  = ref<ModalMode>(null)
const showTypeModal = ref(false)
const saving     = ref(false)
const modalError = ref('')
const editingId  = ref<number | null>(null)

// ── Bulk Upload & Edit State ──────────────────────────────────────────────────
const showBulkModal = ref(false)
const bulkFile = ref<File | null>(null)
const bulkLoading = ref(false)
const bulkError = ref('')
const bulkResult = ref<{ success: number; failed: number; errors: string[] } | null>(null)

const selectedBookIds = ref<number[]>([])
const showBulkEditModal = ref(false)
const bulkEditSaving = ref(false)
const bulkEditError = ref('')

const isAllSelected = computed(() => {
  return books.value.length > 0 && books.value.every(b => selectedBookIds.value.includes(b.id))
})

const isSomeSelected = computed(() => {
  return selectedBookIds.value.length > 0
})

const bulkEditForm = ref({
  updateCategory: false,
  categoryId: '',
  updateLocation: false,
  locationShelf: '',
  updateLanguage: false,
  language: 'English',
  updateItemType: false,
  itemType: 'BOOKS',
  updatePublisher: false,
  publisher: '',
  updatePublishYear: false,
  publishYear: new Date().getFullYear(),
  updateEdition: false,
  edition: '',
  updateIsReferenceOnly: false,
  isReferenceOnly: false,
  updateIsActive: false,
  isActive: true,
})


const itemTypes = ['Journals', 'Thesis', 'CD', 'BOOKS', 'DVD', 'Cartographic Materials', 'Electronics']

const blankForm = () => ({
  title: '', otherTitle: '', isbn: '', issn: '', callNumber: '', edition: '',
  publisher: '', publishYear: new Date().getFullYear(),
  categoryId: '', language: 'English', description: '',
  coverImageUrl: '', locationShelf: '', totalCopies: 1,
  isReferenceOnly: false, isActive: true, itemType: 'BOOKS', authors: ''
})
const form = ref(blankForm())

const typeConfig = computed(() => {
  const type = form.value.itemType;
  const base = {
    titleLabel: 'Main Title *',
    showOtherTitle: true,
    otherTitleLabel: 'Other Title',
    isbnLabel: 'ISBN *',
    showIssn: true,
    issnLabel: 'ISSN',
    callNumberLabel: 'Call Number *',
    showCategory: true,
    showLanguage: true,
    showPublisher: true,
    publisherLabel: 'Publisher',
    showPublishYear: true,
    publishYearLabel: 'Publish Year',
    showEdition: true,
    editionLabel: 'Edition',
    locationLabel: 'Location / Shelf',
    showAuthors: true,
    authorsLabel: 'Authors (Comma Separated)',
  };

  switch (type) {
    case 'Journals':
      return { ...base, titleLabel: 'Journal Name *', editionLabel: 'Issue/Volume', isbnLabel: 'ISSN / Ref No. *', showIssn: false, showOtherTitle: false, authorsLabel: 'Authors / Contributors' };
    case 'Thesis':
      return { ...base, titleLabel: 'Thesis Title *', otherTitleLabel: 'Degree Program', isbnLabel: 'Thesis ID / Ref No. *', showIssn: false, publisherLabel: 'University/Institution', publishYearLabel: 'Submission Year', showEdition: false, authorsLabel: 'Author(s)' };
    case 'CD':
    case 'DVD':
      return { ...base, titleLabel: 'Title *', editionLabel: 'Format/Duration', isbnLabel: 'UPC / EAN *', showIssn: false, publisherLabel: 'Studio/Producer', publishYearLabel: 'Release Year', authorsLabel: 'Artist / Director (Comma Separated)' };
    case 'Cartographic Materials':
      return { ...base, titleLabel: 'Title / Region *', editionLabel: 'Scale', isbnLabel: 'Identifier *', showIssn: false, authorsLabel: 'Cartographer(s)' };
    case 'Electronics':
      return { ...base, titleLabel: 'Item Name *', otherTitleLabel: 'Model / Specs', isbnLabel: 'Serial Number *', callNumberLabel: 'Control Number *', showIssn: false, publisherLabel: 'Brand / Manufacturer', publishYearLabel: 'Acquisition Year', showCategory: false, showLanguage: false, showEdition: false, showAuthors: false };
    default:
      return base;
  }
});

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
    const params: Record<string, string | number> = { 
      page, 
      limit: currentLimit.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value 
    }
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

function handleSortChange() {
  // Toggle order if clicking the same sort option, except if it's the first time
  // Or just always use DESC for createdAt and ASC for title as defaults, but simpler is let them change
  if (sortBy.value === 'title' && sortOrder.value === 'DESC') {
    sortOrder.value = 'ASC'
  } else if (sortBy.value === 'createdAt') {
    sortOrder.value = 'DESC'
  }
  fetchBooks(1)
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function openCreate() {
  showTypeModal.value = true
}

function selectTypeAndCreate(type: string) {
  showTypeModal.value = false
  form.value     = blankForm()
  form.value.itemType = type
  editingId.value = null
  modalError.value = ''
  modalMode.value  = 'create'
}

function openEdit(book: BookRow) {
  form.value = {
    title:          book.title,
    otherTitle:     book.otherTitle ?? '',
    isbn:           book.isbn,
    issn:           book.issn ?? '',
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
    isReferenceOnly: !!book.isReferenceOnly,
    isActive:       !!book.isActive,
    itemType:       book.itemType || 'BOOKS',
    authors:        book.authors?.join(', ') || '',
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
        authors:     createPayload.authors || undefined,
      })
    } else {
      await api.patch(`/books/${editingId.value}`, {
        title:          form.value.title        || undefined,
        otherTitle:     form.value.otherTitle   || undefined,
        isbn:           form.value.isbn         || undefined,
        issn:           form.value.issn         || undefined,
        callNumber:     form.value.callNumber   || undefined,
        edition:        form.value.edition      || undefined,
        publisher:      form.value.publisher    || undefined,
        publishYear:    form.value.publishYear  ? Number(form.value.publishYear) : undefined,
        categoryId:     form.value.categoryId   ? Number(form.value.categoryId)  : undefined,
        language:       form.value.language     || undefined,
        coverImageUrl:  form.value.coverImageUrl || undefined,
        locationShelf:  form.value.locationShelf || undefined,
        isReferenceOnly: !!form.value.isReferenceOnly,
        isActive:       !!form.value.isActive,
        itemType:       form.value.itemType || undefined,
        authors:        form.value.authors || undefined,
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

// ── Bulk Upload ───────────────────────────────────────────────────────────────
function handleBulkFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    bulkFile.value = target.files[0]
  } else {
    bulkFile.value = null
  }
}

async function submitBulkUpload() {
  if (!bulkFile.value) return
  bulkLoading.value = true
  bulkError.value = ''
  bulkResult.value = null
  try {
    const fd = new FormData()
    fd.append('file', bulkFile.value)
    const { data } = await api.post('/books/bulk-upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    bulkResult.value = data
    fetchBooks(1)
  } catch (e: any) {
    bulkError.value = e.response?.data?.message ?? 'Bulk upload failed'
  } finally {
    bulkLoading.value = false
  }
}

function downloadCsvTemplate() {
  const headers = ['Title', 'Author', 'ISBN', 'Call Number', 'Publisher', 'Publish Year', 'Category', 'Language', 'Edition', 'Item Type', 'Location Shelf', 'Total Copies', 'Reference Only', 'Description']
  const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\\n"
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", "Lumina_Book_Bulk_Template.csv")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function closeBulkModal() {
  showBulkModal.value = false
  bulkFile.value = null
  bulkError.value = ''
  bulkResult.value = null
}

// ── Bulk Selection & Edit Functions ──────────────────────────────────────────
function toggleSelectAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (checked) {
    const pageIds = books.value.map(b => b.id)
    const set = new Set([...selectedBookIds.value, ...pageIds])
    selectedBookIds.value = Array.from(set)
  } else {
    const pageIds = new Set(books.value.map(b => b.id))
    selectedBookIds.value = selectedBookIds.value.filter(id => !pageIds.has(id))
  }
}

function toggleSelectBook(id: number) {
  const idx = selectedBookIds.value.indexOf(id)
  if (idx > -1) {
    selectedBookIds.value.splice(idx, 1)
  } else {
    selectedBookIds.value.push(id)
  }
}

function clearSelection() {
  selectedBookIds.value = []
}

// ── Batch Table Edit State & Methods ──────────────────────────────────────────
interface BulkItemEditRow {
  id: number
  title: string
  isbn: string
  callNumber: string
  categoryId: string
  locationShelf: string
  itemType: string
  language: string
  publisher: string
  publishYear: number | null
  edition: string
  isReferenceOnly: boolean
  isActive: boolean
}

const bulkEditItems = ref<BulkItemEditRow[]>([])

const batchFill = ref({
  categoryId: '',
  locationShelf: '',
  itemType: '',
  language: '',
  publisher: '',
  publishYear: null as number | null,
  edition: '',
})

function openBulkEditModal() {
  bulkEditError.value = ''
  const selected = books.value.filter(b => selectedBookIds.value.includes(b.id))
  bulkEditItems.value = selected.map(b => ({
    id: b.id,
    title: b.title,
    isbn: b.isbn,
    callNumber: b.callNumber,
    categoryId: b.category?.id?.toString() ?? '',
    locationShelf: b.locationShelf ?? '',
    itemType: b.itemType || 'BOOKS',
    language: b.language || 'English',
    publisher: b.publisher ?? '',
    publishYear: b.publishYear ?? new Date().getFullYear(),
    edition: b.edition ?? '',
    isReferenceOnly: !!b.isReferenceOnly,
    isActive: !!b.isActive,
  }))
  showBulkEditModal.value = true
}

function removeBulkEditRow(id: number) {
  bulkEditItems.value = bulkEditItems.value.filter(item => item.id !== id)
  selectedBookIds.value = selectedBookIds.value.filter(selectedId => selectedId !== id)
  if (bulkEditItems.value.length === 0) {
    showBulkEditModal.value = false
  }
}

function fillAllCategory() {
  if (!batchFill.value.categoryId) return
  bulkEditItems.value.forEach(item => { item.categoryId = batchFill.value.categoryId })
}

function fillAllLocation() {
  if (!batchFill.value.locationShelf) return
  bulkEditItems.value.forEach(item => { item.locationShelf = batchFill.value.locationShelf })
}

function fillAllItemType() {
  if (!batchFill.value.itemType) return
  bulkEditItems.value.forEach(item => { item.itemType = batchFill.value.itemType })
}

function fillAllLanguage() {
  if (!batchFill.value.language) return
  bulkEditItems.value.forEach(item => { item.language = batchFill.value.language })
}

function fillAllPublisher() {
  if (!batchFill.value.publisher) return
  bulkEditItems.value.forEach(item => { item.publisher = batchFill.value.publisher })
}

function fillAllYear() {
  if (batchFill.value.publishYear === null) return
  bulkEditItems.value.forEach(item => { item.publishYear = batchFill.value.publishYear })
}

function fillAllEdition() {
  if (!batchFill.value.edition) return
  bulkEditItems.value.forEach(item => { item.edition = batchFill.value.edition })
}

function fillAllRefOnly(val: boolean) {
  bulkEditItems.value.forEach(item => { item.isReferenceOnly = val })
}

function fillAllActive(val: boolean) {
  bulkEditItems.value.forEach(item => { item.isActive = val })
}

async function submitBulkEdit() {
  if (bulkEditItems.value.length === 0) return

  bulkEditSaving.value = true
  bulkEditError.value = ''

  try {
    const payload = {
      items: bulkEditItems.value.map(item => ({
        id: item.id,
        categoryId: item.categoryId ? Number(item.categoryId) : undefined,
        locationShelf: item.locationShelf || undefined,
        itemType: item.itemType || undefined,
        language: item.language || undefined,
        publisher: item.publisher || undefined,
        publishYear: item.publishYear ? Number(item.publishYear) : undefined,
        edition: item.edition || undefined,
        isReferenceOnly: !!item.isReferenceOnly,
        isActive: !!item.isActive,
      }))
    }

    await api.patch('/books/batch-update', payload)
    showBulkEditModal.value = false
    clearSelection()
    await fetchBooks(currentPage.value)
  } catch (e: any) {
    bulkEditError.value = e.response?.data?.message ?? 'Batch update failed'
  } finally {
    bulkEditSaving.value = false
  }
}


async function quickBulkToggleActive(activeState: boolean) {
  if (selectedBookIds.value.length === 0) return
  loading.value = true
  try {
    await api.patch('/books/bulk-update', {
      ids: selectedBookIds.value,
      isActive: activeState,
    })
    clearSelection()
    await fetchBooks(currentPage.value)
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Bulk action failed')
  } finally {
    loading.value = false
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
  <div class="w-full max-w-[1600px] mx-auto">

    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-[#447794]/10 flex items-center justify-center">
          <BookOpenIcon class="w-5 h-5 text-[#447794]" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-800">Manage Items</h2>
          <p class="text-xs text-slate-500">{{ totalItems }} item{{ totalItems !== 1 ? 's' : '' }} in catalog</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button @click="showBulkModal = true" class="btn-ghost border border-slate-200">
          <ArrowUpTrayIcon class="w-4 h-4" /> Bulk Upload
        </button>
        <button @click="openCreate" class="btn-primary">
          <PlusIcon class="w-4 h-4" /> Add Item
        </button>
      </div>
    </div>

    <!-- Filters Header Box -->
    <div class="filter-card">
      <div class="relative flex-1 w-full md:w-auto">
        <MagnifyingGlassIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          v-model="searchQuery"
          @input="onSearch"
          type="search"
          placeholder="Search by title, author, ISBN, call number, or accession code..."
          class="w-full pl-10 pr-4 py-2 bg-slate-50 md:bg-white border border-slate-200/80 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5c726a]/30 focus:border-[#5c726a]"
        />
      </div>
      <div class="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
        <DropdownFilter
          v-model="filterCat"
          :options="categoryOptions"
          @change="fetchBooks(1)"
          width="w-48"
        />

        <DropdownFilter
          v-model="sortBy"
          :options="sortOptions"
          @change="handleSortChange"
          width="w-48"
        />
      </div>
    </div>

    <!-- Contextual Bulk Actions Bar -->
    <div
      v-if="selectedBookIds.length > 0"
      class="mb-5 p-3.5 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl border border-slate-800 transition-all"
    >
      <div class="flex items-center gap-3 px-1">
        <span class="w-7 h-7 rounded-xl bg-[#447794] text-xs font-extrabold flex items-center justify-center text-white shadow-inner">
          {{ selectedBookIds.length }}
        </span>
        <div>
          <p class="text-xs font-bold text-slate-200">
            {{ selectedBookIds.length }} item{{ selectedBookIds.length > 1 ? 's' : '' }} selected
          </p>
          <p class="text-[10px] text-slate-400">Perform actions across selected catalog items</p>
        </div>
      </div>
      <div class="flex items-center gap-2.5 flex-wrap">
        <button
          @click="openBulkEditModal"
          class="px-3.5 py-2 rounded-xl bg-[#447794] hover:bg-[#37637b] text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-sm"
        >
          <PencilSquareIcon class="w-4 h-4" /> Bulk Edit
        </button>
        <button
          @click="quickBulkToggleActive(true)"
          class="px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-sm"
        >
          <CheckIcon class="w-4 h-4" /> Activate
        </button>
        <button
          @click="quickBulkToggleActive(false)"
          class="px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-sm"
        >
          <XMarkIcon class="w-4 h-4" /> Deactivate
        </button>
        <div class="h-4 w-px bg-slate-700 hidden sm:block mx-1"></div>
        <button
          @click="clearSelection"
          class="px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
        >
          Deselect All
        </button>
      </div>
    </div>

    <!-- Table Card -->
    <div class="table-card">
      <div v-if="loading" class="p-4 space-y-3">
        <div v-for="i in 6" :key="i" class="skeleton h-12 rounded-xl" />
      </div>

      <div v-else-if="books.length === 0" class="py-16 text-center text-slate-400">
        <BookOpenIcon class="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p class="font-medium text-slate-500">No items found</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr>
              <th class="table-header w-10 text-center pl-4">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate.prop="isSomeSelected && !isAllSelected"
                  @change="toggleSelectAll"
                  class="rounded border-slate-300 text-[#447794] focus:ring-[#447794] w-4 h-4 cursor-pointer"
                  title="Select / Deselect all items on this page"
                />
              </th>
              <th class="table-header text-left">Title / Author</th>
              <th class="table-header text-left">Category</th>
              <th class="table-header text-left">ISBN / Call No. / Accession Code</th>
              <th class="table-header text-left">Copies</th>
              <th class="table-header text-left">Status</th>
              <th class="table-header text-right pr-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="book in books"
              :key="book.id"
              :class="['table-row transition-colors', !book.isActive && 'opacity-60', selectedBookIds.includes(book.id) && 'bg-[#447794]/10']"
            >
              <td class="table-cell w-10 text-center pl-4">
                <input
                  type="checkbox"
                  :value="book.id"
                  :checked="selectedBookIds.includes(book.id)"
                  @change="toggleSelectBook(book.id)"
                  class="rounded border-slate-300 text-[#447794] focus:ring-[#447794] w-4 h-4 cursor-pointer"
                />
              </td>
              <!-- Title / Author -->
              <td class="table-cell max-w-[280px]">
                <p class="font-bold text-slate-800 text-sm truncate">{{ book.title }}</p>
                <p v-if="book.authors?.length" class="text-xs text-slate-400 truncate mt-0.5">{{ book.authors.join(', ') }}</p>
                <p v-else class="text-xs text-slate-300 italic mt-0.5">No authors</p>
              </td>
              <!-- Category -->
              <td class="table-cell text-slate-600">
                <span class="badge-pill-gray text-xs font-semibold">
                  {{ book.category?.name ?? book.itemType ?? 'General' }}
                </span>
              </td>
              <!-- ISBN / Call No. / Accession Code -->
              <td class="table-cell">
                <p class="font-mono text-xs text-slate-700 font-semibold">{{ book.isbn }}</p>
                <p class="font-mono text-xs text-slate-400">{{ book.callNumber }}</p>
                <div v-if="book.copies?.length" class="flex flex-wrap gap-1 mt-1 max-w-[240px]">
                  <span 
                    v-for="copy in book.copies" 
                    :key="copy.id"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200/80 rounded text-[10px] font-mono text-slate-700 font-medium"
                    :title="`Copy Barcode: ${copy.barcode} (${copy.condition})`"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="copy.isActive ? 'bg-emerald-500' : 'bg-slate-300'"></span>
                    {{ copy.barcode }}
                  </span>
                </div>
              </td>
              <!-- Copies -->
              <td class="table-cell">
                <span :class="['badge-pill-sky font-semibold', availBadge(book.availableCopies, book.totalCopies)]">
                  {{ book.availableCopies }} / {{ book.totalCopies }}
                </span>
              </td>
              <!-- Status -->
              <td class="table-cell">
                <span v-if="book.isActive" class="badge-pill-green">
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
              <!-- Actions -->
              <td class="table-cell text-right pr-6">
                <div class="flex items-center justify-end gap-3 text-xs font-semibold">
                  <button
                    @click="openEdit(book)"
                    class="text-[#5c726a] hover:text-[#3b4d47] transition-colors"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    @click="deleteTarget = book"
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
              {{ modalMode === 'create' ? 'Add New Item' : 'Edit Item' }}
            </h3>
            <button @click="closeModal" class="text-slate-400 hover:text-slate-600">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="saveBook" class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Item Type *</label>
                <select v-model="form.itemType" class="input">
                  <option v-for="type in itemTypes" :key="type" :value="type">{{ type }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{{ typeConfig.titleLabel }}</label>
                <input v-model="form.title" type="text" required class="input" />
              </div>
              <div v-if="typeConfig.showOtherTitle" class="col-span-2 sm:col-span-1">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{{ typeConfig.otherTitleLabel }}</label>
                <input v-model="form.otherTitle" type="text" class="input" />
              </div>
              <div v-if="typeConfig.showAuthors" class="col-span-2">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{{ typeConfig.authorsLabel }}</label>
                <input v-model="form.authors" type="text" class="input" placeholder="e.g. John Doe, Jane Smith" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{{ typeConfig.isbnLabel }}</label>
                <input v-model="form.isbn" type="text" :required="modalMode === 'create'" class="input font-mono" />
              </div>
              <div v-if="typeConfig.showIssn">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{{ typeConfig.issnLabel }}</label>
                <input v-model="form.issn" type="text" class="input font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{{ typeConfig.callNumberLabel }}</label>
                <input v-model="form.callNumber" type="text" required class="input font-mono" />
              </div>
              <div v-if="typeConfig.showCategory">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Category</label>
                <select v-model="form.categoryId" class="input">
                  <option value="">Select category...</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <div v-if="typeConfig.showLanguage">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Language</label>
                <input v-model="form.language" type="text" class="input" />
              </div>
              <div v-if="typeConfig.showPublisher">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{{ typeConfig.publisherLabel }}</label>
                <input v-model="form.publisher" type="text" class="input" />
              </div>
              <div v-if="typeConfig.showPublishYear">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{{ typeConfig.publishYearLabel }}</label>
                <input v-model="form.publishYear" type="number" class="input" />
              </div>
              <div v-if="typeConfig.showEdition">
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{{ typeConfig.editionLabel }}</label>
                <input v-model="form.edition" type="text" class="input" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{{ typeConfig.locationLabel }}</label>
                <input v-model="form.locationShelf" type="text" class="input" />
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
                {{ saving ? 'Saving...' : modalMode === 'create' ? 'Add Item' : 'Save Changes' }}
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

    <!-- Item Type Modal -->
    <Teleport to="body">
      <div v-if="showTypeModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-800">Select Item Type</h3>
            <button @click="showTypeModal = false" class="text-slate-400 hover:text-slate-600">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="type in itemTypes"
                :key="type"
                @click="selectTypeAndCreate(type)"
                class="flex items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-[#447794] hover:bg-[#447794]/5 hover:text-[#447794] transition-all text-sm font-semibold text-slate-700"
              >
                {{ type }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

  </div>

    <!-- Bulk Upload Modal -->
    <Teleport to="body">
      <div v-if="showBulkModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
          <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <h3 class="font-bold text-slate-800 flex items-center gap-2">
              <ArrowUpTrayIcon class="w-5 h-5 text-[#447794]" />
              Bulk Upload Books
            </h3>
            <button @click="closeBulkModal" class="text-slate-400 hover:text-slate-600">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <div v-if="!bulkResult">
            <p class="text-sm text-slate-500 mb-4">
              Upload a CSV file to add multiple books at once. Make sure your file follows the standard format.
            </p>
            <button @click="downloadCsvTemplate" type="button" class="flex items-center gap-2 text-sm font-semibold text-[#447794] hover:underline mb-6">
              <DocumentArrowDownIcon class="w-4 h-4" />
              Download CSV Template
            </button>

            <form @submit.prevent="submitBulkUpload" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Select CSV File</label>
                <input type="file" accept=".csv" required @change="handleBulkFileChange" class="input p-2" />
              </div>
              
              <div v-if="bulkError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {{ bulkError }}
              </div>

              <div class="flex gap-3 pt-2">
                <button type="button" @click="closeBulkModal" class="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" :disabled="bulkLoading || !bulkFile" class="btn-primary flex-1 justify-center">
                  {{ bulkLoading ? 'Uploading...' : 'Upload Data' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Results View -->
          <div v-else>
            <div class="text-center mb-6">
              <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                :class="bulkResult.failed === 0 ? 'bg-emerald-100' : 'bg-amber-100'">
                <CheckIcon v-if="bulkResult.failed === 0" class="w-6 h-6 text-emerald-600" />
                <ArrowUpTrayIcon v-else class="w-6 h-6 text-amber-600" />
              </div>
              <h4 class="font-bold text-slate-800 text-lg">Upload Complete</h4>
              <p class="text-sm text-slate-500 mt-1">Processed {{ bulkResult.success + bulkResult.failed }} records</p>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
              <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                <p class="text-2xl font-bold text-emerald-600">{{ bulkResult.success }}</p>
                <p class="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Success</p>
              </div>
              <div class="p-4 rounded-xl bg-rose-50 border border-rose-100 text-center">
                <p class="text-2xl font-bold text-rose-600">{{ bulkResult.failed }}</p>
                <p class="text-xs font-semibold text-rose-800 uppercase tracking-wider">Failed</p>
              </div>
            </div>

            <div v-if="bulkResult.errors.length > 0" class="mb-6">
              <p class="text-sm font-semibold text-slate-700 mb-2">Error Details:</p>
              <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                <ul class="list-disc list-inside text-xs text-rose-600 space-y-1">
                  <li v-for="(err, i) in bulkResult.errors" :key="i">{{ err }}</li>
                </ul>
              </div>
            </div>

            <button @click="closeBulkModal" class="btn-primary w-full justify-center">Done</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Batch Table Edit Modal (Spreadsheet-like Grid) -->
    <Teleport to="body">
      <div v-if="showBulkEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl w-full max-w-7xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-[#447794]/10 flex items-center justify-center">
                <PencilSquareIcon class="w-5 h-5 text-[#447794]" />
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-base">Batch Table Editor</h3>
                <p class="text-xs text-slate-500">Edit fields individually per row or use header tools to fill columns across all {{ bulkEditItems.length }} item(s).</p>
              </div>
            </div>
            <button @click="showBulkEditModal = false" class="text-slate-400 hover:text-slate-600 transition-colors">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Quick Fill Header Toolbar -->
          <div class="px-6 py-3 bg-slate-50 border-b border-slate-200/80 text-xs shrink-0">
            <div class="flex items-center gap-2 mb-2 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              <SparklesIcon class="w-4 h-4 text-[#447794]" /> Quick Apply to All Rows:
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <!-- Category Fill -->
              <div class="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200">
                <select v-model="batchFill.categoryId" class="text-xs py-1 px-2 border-0 bg-transparent flex-1 focus:outline-none text-slate-700">
                  <option value="">Fill Category...</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
                <button type="button" @click="fillAllCategory" class="px-2 py-1 bg-[#447794] text-white font-semibold rounded hover:bg-[#37627a] transition-colors text-[11px]">Apply</button>
              </div>

              <!-- Location Fill -->
              <div class="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200">
                <input v-model="batchFill.locationShelf" type="text" placeholder="Fill Location..." class="text-xs py-1 px-2 border-0 bg-transparent flex-1 focus:outline-none text-slate-700" />
                <button type="button" @click="fillAllLocation" class="px-2 py-1 bg-[#447794] text-white font-semibold rounded hover:bg-[#37627a] transition-colors text-[11px]">Apply</button>
              </div>

              <!-- Item Type Fill -->
              <div class="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200">
                <select v-model="batchFill.itemType" class="text-xs py-1 px-2 border-0 bg-transparent flex-1 focus:outline-none text-slate-700">
                  <option value="">Fill Item Type...</option>
                  <option v-for="type in itemTypes" :key="type" :value="type">{{ type }}</option>
                </select>
                <button type="button" @click="fillAllItemType" class="px-2 py-1 bg-[#447794] text-white font-semibold rounded hover:bg-[#37627a] transition-colors text-[11px]">Apply</button>
              </div>

              <!-- Quick Active/Ref Toggles -->
              <div class="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 justify-around">
                <button type="button" @click="fillAllActive(true)" class="text-[11px] font-semibold text-emerald-700 hover:underline">All Active</button>
                <span class="text-slate-300">|</span>
                <button type="button" @click="fillAllRefOnly(true)" class="text-[11px] font-semibold text-sky-700 hover:underline">All Ref Only</button>
              </div>
            </div>
          </div>

          <!-- Main Scrollable Spreadsheet Grid -->
          <div class="p-6 overflow-y-auto flex-1">
            <div v-if="bulkEditItems.length === 0" class="py-12 text-center text-slate-400">
              <p>No items selected for batch edit.</p>
            </div>
            <div v-else class="overflow-x-auto border border-slate-200 rounded-xl">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th class="p-3 w-56">Item / Call No.</th>
                    <th class="p-3 w-40">Category</th>
                    <th class="p-3 w-36">Location / Shelf</th>
                    <th class="p-3 w-32">Item Type</th>
                    <th class="p-3 w-28">Language</th>
                    <th class="p-3 w-36">Publisher & Year</th>
                    <th class="p-3 w-24 text-center">Ref Only</th>
                    <th class="p-3 w-24 text-center">Active</th>
                    <th class="p-3 w-12 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 bg-white">
                  <tr v-for="item in bulkEditItems" :key="item.id" class="hover:bg-slate-50/80 transition-colors">
                    <!-- Title & ISBN -->
                    <td class="p-2.5 align-top">
                      <p class="font-bold text-slate-800 line-clamp-1" :title="item.title">{{ item.title }}</p>
                      <p class="font-mono text-[10px] text-slate-400 mt-0.5">{{ item.isbn }} | {{ item.callNumber }}</p>
                    </td>

                    <!-- Category -->
                    <td class="p-2 align-top">
                      <select v-model="item.categoryId" class="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#447794]">
                        <option value="">(None)</option>
                        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                      </select>
                    </td>

                    <!-- Location / Shelf -->
                    <td class="p-2 align-top">
                      <input v-model="item.locationShelf" type="text" placeholder="Shelf..." class="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#447794]" />
                    </td>

                    <!-- Item Type -->
                    <td class="p-2 align-top">
                      <select v-model="item.itemType" class="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#447794]">
                        <option v-for="type in itemTypes" :key="type" :value="type">{{ type }}</option>
                      </select>
                    </td>

                    <!-- Language -->
                    <td class="p-2 align-top">
                      <input v-model="item.language" type="text" class="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#447794]" />
                    </td>

                    <!-- Publisher & Year -->
                    <td class="p-2 align-top space-y-1">
                      <input v-model="item.publisher" type="text" placeholder="Publisher" class="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#447794]" />
                      <input v-model="item.publishYear" type="number" placeholder="Year" class="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#447794]" />
                    </td>

                    <!-- Reference Only -->
                    <td class="p-2.5 align-top text-center">
                      <input v-model="item.isReferenceOnly" type="checkbox" class="w-4 h-4 accent-[#447794] rounded cursor-pointer mt-1" />
                    </td>

                    <!-- Active -->
                    <td class="p-2.5 align-top text-center">
                      <input v-model="item.isActive" type="checkbox" class="w-4 h-4 accent-[#447794] rounded cursor-pointer mt-1" />
                    </td>

                    <!-- Remove row -->
                    <td class="p-2.5 align-top text-center">
                      <button @click="removeBulkEditRow(item.id)" title="Remove from batch edit" type="button" class="text-rose-400 hover:text-rose-600 transition-colors p-1">
                        <TrashIcon class="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div v-if="bulkEditError" class="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {{ bulkEditError }}
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
            <p class="text-xs text-slate-500">
              Ready to submit updates for <strong class="text-slate-700">{{ bulkEditItems.length }}</strong> item(s).
            </p>
            <div class="flex gap-3">
              <button type="button" @click="showBulkEditModal = false" class="btn-ghost px-5 justify-center">Cancel</button>
              <button type="button" @click="submitBulkEdit" :disabled="bulkEditSaving || bulkEditItems.length === 0" class="btn-primary px-6 justify-center">
                {{ bulkEditSaving ? 'Saving...' : `Save Changes (${bulkEditItems.length})` }}
              </button>
            </div>
          </div>

        </div>
      </div>
    </Teleport>

</template>

