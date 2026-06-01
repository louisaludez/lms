<script setup lang="ts">
import { ref } from 'vue'
import api from '@/api/axios'
import { PrinterIcon, DocumentTextIcon, UserGroupIcon, BookOpenIcon, CheckCircleIcon, ExclamationCircleIcon, ClipboardDocumentListIcon, SparklesIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

const currentYear = new Date().getFullYear().toString()

// Common options
const commonFrequencies = ['Monthly', 'Annually']
const entryFrequencies = ['Daily', 'Weekly', 'Monthly', 'Annually']
const departments = [
  'Bachelor of Arts (AB): English Language',
  'Bachelor of Elementary Education (BEEd): Generalist',
  'Bachelor of Secondary Education (BSEd): Majors in English and Mathematics',
  'Bachelor of Science (BS): Midwifery'
]

// State for each report
const entryReport = ref({ frequency: 'Daily', department: 'Bachelor of Arts (AB): English Language', year: currentYear })
const borrowedReport = ref({ frequency: 'Monthly' })
const returnedReport = ref({ frequency: 'Monthly' })
const overdueReport = ref({ frequency: 'Monthly' })

// Print State
const printData = ref<any>(null)
const printType = ref<string>('')
const printParams = ref<any>({})
const isFetching = ref(false)

async function viewReport(reportName: string, parameters: any = {}) {
  try {
    isFetching.value = true;
    printType.value = reportName;
    printParams.value = parameters;
    printData.value = null; // reset
    
    let res;
    if (reportName === 'Library Entry and Exit') {
      res = await api.get('/reports/entry-exit', { params: parameters })
    } else if (reportName === 'Books Borrowed') {
      res = await api.get('/reports/borrowed', { params: parameters })
    } else if (reportName === 'Books Returned') {
      res = await api.get('/reports/returned', { params: parameters })
    } else if (reportName === 'Overdue Books') {
      res = await api.get('/reports/overdue', { params: parameters })
    } else if (reportName === 'Registered Users') {
      res = await api.get('/reports/registered-users')
    } else if (reportName === 'Inventory') {
      res = await api.get('/reports/inventory')
    } else if (reportName === 'New Acquisitions') {
      res = await api.get('/reports/new-acquisitions')
    }
    
    printData.value = res?.data || [];
    
    // Scroll to the preview section smoothly
    setTimeout(() => {
      document.getElementById('report-preview-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

  } catch (error) {
    console.error('Error fetching report data:', error);
    alert('Failed to generate report. Please try again.');
  } finally {
    isFetching.value = false;
  }
}

function triggerPrint() {
  window.print();
}
</script>

<template>
  <div class="reports-container space-y-8 max-w-7xl mx-auto p-4 md:p-8 relative">
    
    <!-- Loading Overlay for API Fetch -->
    <div v-if="isFetching" class="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center hide-on-print">
       <div class="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center max-w-sm w-full mx-4">
          <ArrowPathIcon class="w-10 h-10 text-[#447794] animate-spin mb-4" />
          <h3 class="text-lg font-bold text-slate-800">Generating Report...</h3>
          <p class="text-sm text-slate-500 text-center mt-1">Fetching the latest data. Please wait.</p>
       </div>
    </div>

    <!-- Header -->
    <div class="hide-on-print mb-8">
      <h1 class="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
         Report Generation
      </h1>
      <p class="text-sm text-slate-500 mt-2">Select the parameters and generate library reports to view and print.</p>
    </div>

    <!-- Reports Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 hide-on-print">
      
      <!-- Library Entry and Exit Report -->
      <div class="card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full hover:shadow-md transition-shadow lg:col-span-3">
        <div class="flex items-start gap-4 mb-6 border-b border-slate-100 pb-4">
          <div class="p-3 bg-[#447794]/10 rounded-xl text-[#447794]">
            <UserGroupIcon class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800">Library Entry and Exit</h3>
            <p class="text-sm text-slate-500">Track visitor statistics across different departments.</p>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 flex-1">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Frequency</label>
            <select v-model="entryReport.frequency" class="w-full rounded-lg border-slate-300 shadow-sm focus:border-[#447794] focus:ring-[#447794] text-sm bg-slate-50 outline-none">
              <option v-for="f in entryFrequencies" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Department</label>
            <select v-model="entryReport.department" class="w-full rounded-lg border-slate-300 shadow-sm focus:border-[#447794] focus:ring-[#447794] text-sm bg-slate-50 outline-none">
              <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Year</label>
            <input type="number" v-model="entryReport.year" class="w-full rounded-lg border-slate-300 shadow-sm focus:border-[#447794] focus:ring-[#447794] text-sm bg-slate-50 outline-none" />
          </div>
        </div>

        <button @click="viewReport('Library Entry and Exit', entryReport)" :disabled="isFetching" class="w-full md:w-1/3 ml-auto btn-primary bg-[#447794] text-white py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-[#366179] transition-colors font-medium disabled:opacity-50">
          <DocumentTextIcon class="w-5 h-5" /> Generate Report
        </button>
      </div>

      <!-- Books Borrowed Report -->
      <div class="card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full hover:shadow-md transition-shadow">
        <div class="flex items-start gap-4 mb-6">
          <div class="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <BookOpenIcon class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800">Books Borrowed</h3>
            <p class="text-sm text-slate-500">Analytics on book borrowing.</p>
          </div>
        </div>
        
        <div class="space-y-4 mb-6 flex-1">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Frequency</label>
            <select v-model="borrowedReport.frequency" class="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm bg-slate-50 outline-none">
              <option v-for="f in commonFrequencies" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>
        </div>

        <button @click="viewReport('Books Borrowed', borrowedReport)" :disabled="isFetching" class="w-full btn-primary bg-indigo-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50">
          <DocumentTextIcon class="w-5 h-5" /> Generate Report
        </button>
      </div>

      <!-- Books Returned Report -->
      <div class="card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full hover:shadow-md transition-shadow">
        <div class="flex items-start gap-4 mb-6">
          <div class="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircleIcon class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800">Books Returned</h3>
            <p class="text-sm text-slate-500">Analytics on book returning.</p>
          </div>
        </div>
        
        <div class="space-y-4 mb-6 flex-1">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Frequency</label>
            <select v-model="returnedReport.frequency" class="w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm bg-slate-50 outline-none">
              <option v-for="f in commonFrequencies" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>
        </div>

        <button @click="viewReport('Books Returned', returnedReport)" :disabled="isFetching" class="w-full btn-primary bg-emerald-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50">
          <DocumentTextIcon class="w-5 h-5" /> Generate Report
        </button>
      </div>

      <!-- Overdue Books Report -->
      <div class="card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full hover:shadow-md transition-shadow">
        <div class="flex items-start gap-4 mb-6">
          <div class="p-3 bg-rose-50 rounded-xl text-rose-600">
            <ExclamationCircleIcon class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800">Overdue Books</h3>
            <p class="text-sm text-slate-500">Monitor exceeded return dates.</p>
          </div>
        </div>
        
        <div class="space-y-4 mb-6 flex-1">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Frequency</label>
            <select v-model="overdueReport.frequency" class="w-full rounded-lg border-slate-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 text-sm bg-slate-50 outline-none">
              <option v-for="f in commonFrequencies" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>
        </div>

        <button @click="viewReport('Overdue Books', overdueReport)" :disabled="isFetching" class="w-full btn-primary bg-rose-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors font-medium disabled:opacity-50">
          <DocumentTextIcon class="w-5 h-5" /> Generate Report
        </button>
      </div>

      <!-- Registered Users Report -->
      <div class="card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full hover:shadow-md transition-shadow">
        <div class="flex items-start gap-4 mb-6">
          <div class="p-3 bg-blue-50 rounded-xl text-blue-600">
            <UserGroupIcon class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800">Registered Users</h3>
            <p class="text-sm text-slate-500">Complete list of registered users.</p>
          </div>
        </div>
        
        <div class="flex-1 flex items-center justify-center py-4 mb-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
           <span class="text-sm text-slate-400">No parameters needed</span>
        </div>

        <button @click="viewReport('Registered Users')" :disabled="isFetching" class="w-full btn-primary bg-blue-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors font-medium disabled:opacity-50">
          <DocumentTextIcon class="w-5 h-5" /> Generate Report
        </button>
      </div>

      <!-- Inventory Report -->
      <div class="card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full hover:shadow-md transition-shadow">
        <div class="flex items-start gap-4 mb-6">
          <div class="p-3 bg-amber-50 rounded-xl text-amber-600">
            <ClipboardDocumentListIcon class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800">Inventory Report</h3>
            <p class="text-sm text-slate-500">Annual overview of all assets.</p>
          </div>
        </div>
        
        <div class="flex-1 flex items-center justify-center py-4 mb-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
           <span class="text-sm text-slate-400">Current Library Inventory</span>
        </div>

        <button @click="viewReport('Inventory')" :disabled="isFetching" class="w-full btn-primary bg-amber-500 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors font-medium disabled:opacity-50">
          <DocumentTextIcon class="w-5 h-5" /> Generate Report
        </button>
      </div>

      <!-- New Acquisitions Report -->
      <div class="card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full hover:shadow-md transition-shadow">
        <div class="flex items-start gap-4 mb-6">
          <div class="p-3 bg-purple-50 rounded-xl text-purple-600">
            <SparklesIcon class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800">New Acquisitions</h3>
            <p class="text-sm text-slate-500">Recently added books/materials.</p>
          </div>
        </div>
        
        <div class="flex-1 flex items-center justify-center py-4 mb-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
           <span class="text-sm text-slate-400">Added in the last year</span>
        </div>

        <button @click="viewReport('New Acquisitions')" :disabled="isFetching" class="w-full btn-primary bg-purple-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors font-medium disabled:opacity-50">
          <DocumentTextIcon class="w-5 h-5" /> Generate Report
        </button>
      </div>

    </div>

    <!-- 
      ======================================================
      REPORT PREVIEW & PRINT LAYOUT
      ======================================================
    -->
    <div id="report-preview-section" v-if="printData" class="mt-12 bg-white p-6 md:p-10 rounded-2xl shadow-md border border-slate-200 print:shadow-none print:border-none print:mt-0 print:p-0 transition-all duration-500 ease-in-out">
      
      <!-- Preview Header (Only visible on screen) -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-200 hide-on-print">
        <div>
          <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DocumentTextIcon class="w-7 h-7 text-[#447794]" /> 
            Report Preview
          </h2>
          <p class="text-slate-500 text-sm mt-1">Review the generated data below before printing.</p>
        </div>
        <button @click="triggerPrint" class="btn-primary bg-[#447794] text-white py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 hover:bg-[#366179] transition-colors font-medium shadow-lg shadow-[#447794]/20">
          <PrinterIcon class="w-5 h-5" /> Print This Report
        </button>
      </div>

      <!-- Actual Print/Preview Content -->
      <div class="print-section text-slate-800 w-full overflow-x-auto">
        
        <div class="text-center mb-8 border-b-2 border-slate-800 pb-6 print:border-b-4">
          <h1 class="text-3xl print:text-4xl font-bold text-slate-900 mb-2">Lumina Library - {{ printType }}</h1>
          <p class="text-slate-600 font-medium text-sm print:text-base">Generated on {{ new Date().toLocaleDateString() }} at {{ new Date().toLocaleTimeString() }}</p>
          
          <div class="mt-4 flex justify-center gap-6 text-sm print:text-base font-semibold text-slate-700">
             <span v-if="printParams.frequency">Frequency: {{ printParams.frequency }}</span>
             <span v-if="printParams.department">Department: {{ printParams.department }}</span>
             <span v-if="printParams.year">Year: {{ printParams.year }}</span>
          </div>
        </div>

        <!-- Entry Exit -->
        <table v-if="printType === 'Library Entry and Exit'" class="w-full text-left border-collapse text-sm print:text-base print-table min-w-[600px]">
          <thead>
            <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
              <th class="py-3 px-4">Period</th>
              <th class="py-3 px-4 text-right">Entries</th>
              <th class="py-3 px-4 text-right">Exits</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in printData" :key="idx" class="border-b border-slate-200 hover:bg-slate-50">
              <td class="py-3 px-4 font-medium">{{ row.period }}</td>
              <td class="py-3 px-4 text-right">{{ row.entries }}</td>
              <td class="py-3 px-4 text-right">{{ row.exits }}</td>
            </tr>
            <tr v-if="!printData || !printData.length"><td colspan="3" class="py-8 text-center text-slate-500 italic border-b border-slate-200">No data found for this period.</td></tr>
          </tbody>
        </table>

        <!-- Books Borrowed / Returned -->
        <table v-if="printType === 'Books Borrowed' || printType === 'Books Returned'" class="w-full text-left border-collapse text-sm print:text-base print-table min-w-[600px]">
          <thead>
            <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
              <th class="py-3 px-4">Period</th>
              <th class="py-3 px-4 w-1/2">Book Title</th>
              <th class="py-3 px-4 text-right">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in printData" :key="idx" class="border-b border-slate-200 hover:bg-slate-50">
              <td class="py-3 px-4 font-medium whitespace-nowrap">{{ row.period }}</td>
              <td class="py-3 px-4">{{ row.title }}</td>
              <td class="py-3 px-4 text-right font-bold text-[#447794]">{{ row.borrowCount || row.returnCount }}</td>
            </tr>
            <tr v-if="!printData || !printData.length"><td colspan="3" class="py-8 text-center text-slate-500 italic border-b border-slate-200">No data found for this period.</td></tr>
          </tbody>
        </table>

        <!-- Overdue Books -->
        <table v-if="printType === 'Overdue Books'" class="w-full text-left border-collapse text-sm print:text-base print-table min-w-[800px]">
          <thead>
            <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
              <th class="py-3 px-4">Period</th>
              <th class="py-3 px-4">Borrower</th>
              <th class="py-3 px-4 w-1/3">Book Title</th>
              <th class="py-3 px-4">Due Date</th>
              <th class="py-3 px-4 text-right">Days Overdue</th>
              <th class="py-3 px-4 text-right">Fine</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in printData" :key="idx" class="border-b border-slate-200 hover:bg-slate-50">
              <td class="py-3 px-4 whitespace-nowrap">{{ row.period }}</td>
              <td class="py-3 px-4 font-medium">{{ row.first_name }} {{ row.last_name }}</td>
              <td class="py-3 px-4">{{ row.title }}</td>
              <td class="py-3 px-4 whitespace-nowrap">{{ new Date(row.due_date).toLocaleDateString() }}</td>
              <td class="py-3 px-4 text-right font-bold text-rose-600">{{ row.overdue_days }}</td>
              <td class="py-3 px-4 text-right text-rose-600 font-medium">₱{{ Number(row.fine_amount).toFixed(2) }}</td>
            </tr>
            <tr v-if="!printData || !printData.length"><td colspan="6" class="py-8 text-center text-slate-500 italic border-b border-slate-200">No overdue books found.</td></tr>
          </tbody>
        </table>

        <!-- Registered Users -->
        <table v-if="printType === 'Registered Users'" class="w-full text-left border-collapse text-sm print:text-base print-table min-w-[600px]">
          <thead>
            <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
              <th class="py-3 px-4">Name</th>
              <th class="py-3 px-4">Email</th>
              <th class="py-3 px-4">Role</th>
              <th class="py-3 px-4">Department</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in printData" :key="idx" class="border-b border-slate-200 hover:bg-slate-50">
              <td class="py-3 px-4 font-medium">{{ row.first_name }} {{ row.last_name }}</td>
              <td class="py-3 px-4">{{ row.email }}</td>
              <td class="py-3 px-4 capitalize">
                <span class="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold print:bg-transparent print:p-0 print:text-sm">
                  {{ (row.role || '').replace('_', ' ') }}
                </span>
              </td>
              <td class="py-3 px-4">{{ row.department || '-' }}</td>
            </tr>
            <tr v-if="!printData || !printData.length"><td colspan="4" class="py-8 text-center text-slate-500 italic border-b border-slate-200">No users found.</td></tr>
          </tbody>
        </table>

        <!-- Inventory -->
        <table v-if="printType === 'Inventory'" class="w-full text-left border-collapse text-sm print:text-base print-table min-w-[800px]">
          <thead>
            <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
              <th class="py-3 px-4 w-1/3">Book Title</th>
              <th class="py-3 px-4">ISBN</th>
              <th class="py-3 px-4">Category</th>
              <th class="py-3 px-4 text-center">Total Copies</th>
              <th class="py-3 px-4 text-center">Available</th>
              <th class="py-3 px-4 text-center">Checked Out</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in printData" :key="idx" class="border-b border-slate-200 hover:bg-slate-50">
              <td class="py-3 px-4 font-medium">{{ row.title }}</td>
              <td class="py-3 px-4 font-mono text-xs text-slate-500 print:text-sm">{{ row.isbn }}</td>
              <td class="py-3 px-4">{{ row.category || 'Uncategorized' }}</td>
              <td class="py-3 px-4 text-center">{{ row.total_copies }}</td>
              <td class="py-3 px-4 text-center font-bold text-emerald-600">{{ row.available_copies }}</td>
              <td class="py-3 px-4 text-center font-semibold text-amber-600">{{ row.checked_out_copies }}</td>
            </tr>
            <tr v-if="!printData || !printData.length"><td colspan="6" class="py-8 text-center text-slate-500 italic border-b border-slate-200">No inventory found.</td></tr>
          </tbody>
        </table>

        <!-- New Acquisitions -->
        <table v-if="printType === 'New Acquisitions'" class="w-full text-left border-collapse text-sm print:text-base print-table min-w-[600px]">
          <thead>
            <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
              <th class="py-3 px-4 w-1/2">Book Title</th>
              <th class="py-3 px-4">ISBN</th>
              <th class="py-3 px-4 text-right">Acquisition Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in printData" :key="idx" class="border-b border-slate-200 hover:bg-slate-50">
              <td class="py-3 px-4 font-medium">{{ row.title }}</td>
              <td class="py-3 px-4 font-mono text-xs text-slate-500 print:text-sm">{{ row.isbn }}</td>
              <td class="py-3 px-4 text-right whitespace-nowrap">{{ new Date(row.acquisition_date).toLocaleDateString() }}</td>
            </tr>
            <tr v-if="!printData || !printData.length"><td colspan="3" class="py-8 text-center text-slate-500 italic border-b border-slate-200">No new acquisitions found in the last year.</td></tr>
          </tbody>
        </table>
        
      </div>
    </div>

  </div>
</template>

<style scoped>
@media print {
  .hide-on-print {
    display: none !important;
  }
  .reports-container {
    max-width: 100% !important;
    background: white !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    background: white !important;
  }
  .print-table th {
    background-color: #f1f5f9 !important; /* slate-100 */
    border-bottom: 2px solid #cbd5e1 !important; /* slate-300 */
    color: #334155 !important;
  }
  .print-table td {
    border-bottom: 1px solid #e2e8f0 !important;
  }
}
</style>
