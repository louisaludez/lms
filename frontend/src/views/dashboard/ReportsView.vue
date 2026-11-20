<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import api from '@/api/axios'
import { PrinterIcon, DocumentTextIcon, UserGroupIcon, BookOpenIcon, CheckCircleIcon, ExclamationCircleIcon, ClipboardDocumentListIcon, SparklesIcon, ArrowPathIcon, FunnelIcon, BuildingOfficeIcon, ArrowDownTrayIcon, XMarkIcon, ChevronDownIcon, DocumentArrowDownIcon } from '@heroicons/vue/24/outline'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { Bar } from 'vue-chartjs'
import ndcHeader from '@/assets/ndc_header.jpg'
import { jsPDF } from 'jspdf'
import { Document, Header, ImageRun, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

// Click outside composable
function useClickOutside(callback: () => void) {
  const elementRef = ref<HTMLElement | null>(null)

  onMounted(() => {
    document.addEventListener('click', handleClickOutside)
  })

  const handleClickOutside = (event: MouseEvent) => {
    if (elementRef.value && !elementRef.value.contains(event.target as Node)) {
      callback()
    }
  }

  return { elementRef }
}

const currentYear = new Date().getFullYear().toString()

function getDefaultDateValue(frequency: string) {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  if (frequency === 'Daily') return `${y}-${m}-${day}`
  if (frequency === 'Weekly') {
    const dCopy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = dCopy.getUTCDay() || 7
    dCopy.setUTCDate(dCopy.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(dCopy.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((dCopy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return `${dCopy.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
  }
  if (frequency === 'Monthly') return `${y}-${m}`
  return y.toString()
}

// Common options
const commonFrequencies = ['Monthly', 'Annually']
const entryFrequencies = ['Daily', 'Weekly', 'Monthly', 'Annually']

const defaultDepartments = [
  'All Departments',
  'TVL',
  'GAS',
  'HUMSS',
  'STEM',
  'AB English',
  'BS Midwifery',
  'BEEd',
  'BSED major in English',
  'BSED major in Mathematics',
  'Bachelor of Arts (AB): English Language',
  'Bachelor of Elementary Education (BEEd): Generalist',
  'Bachelor of Secondary Education (BSEd): Majors in English and Mathematics',
  'Bachelor of Science (BS): Midwifery',
  'Elementary',
  'Highschool',
  'Senior High School',
]

const departments = ref<string[]>([...defaultDepartments])

onMounted(async () => {
  try {
    const { data } = await api.get<{ id: number; name: string; code: string }[]>('/users/departments')
    if (data && data.length > 0) {
      const fetchedNames = data.map(d => d.name)
      const combined = Array.from(new Set(['All Departments', ...fetchedNames, ...defaultDepartments.slice(1)]))
      departments.value = combined
    }
  } catch (e) {
    console.error('Failed to load dynamic departments for reports:', e)
  }
})

const reportTypes = [
  'Library Entry and Exit',
  'Department Library Entry',
  'Books Borrowed',
  'Books Returned',
  'Overdue Books',
  'Registered Users',
  'Inventory',
  'New Acquisitions'
]

const selectedReportType = ref('Library Entry and Exit')

const reportParams = ref({
  frequency: 'Monthly',
  category: 'All Categories',
  department: 'All Departments',
  startDate: getDefaultDateValue('Monthly'),
  endDate: getDefaultDateValue('Monthly')
})

const categories = ['All Categories', 'College', 'Senior High', 'High School', 'Elementary', 'Other']

function getDepartmentCategory(name: string) {
  if (name === 'All Departments') return 'All Categories'
  const lower = name.toLowerCase()
  if (lower.includes('bachelor') || lower.includes('ab ') || lower.includes('bs ') || lower.includes('bsed') || lower.includes('beed') || lower.includes('college')) return 'College'
  if (lower.includes('senior') || lower.includes('tvl') || lower.includes('gas') || lower.includes('humss') || lower.includes('stem') || lower.includes('shs')) return 'Senior High'
  if (lower.includes('highschool') || lower.includes('junior') || lower.includes('jhs')) return 'High School'
  if (lower.includes('elementary') || lower.includes('grade')) return 'Elementary'
  return 'Other'
}

const filteredDepartments = computed(() => {
  if (reportParams.value.category === 'All Categories') return departments.value
  return departments.value.filter(d => getDepartmentCategory(d) === reportParams.value.category || d === 'All Departments')
})

watch(() => reportParams.value.category, () => {
  reportParams.value.department = 'All Departments'
})

watch(selectedReportType, (newType) => {
  if (['Books Borrowed', 'Books Returned', 'Overdue Books'].includes(newType)) {
    if (!commonFrequencies.includes(reportParams.value.frequency)) {
      reportParams.value.frequency = 'Monthly'
    }
  }
})

watch(() => reportParams.value.frequency, (newFreq) => {
  reportParams.value.startDate = getDefaultDateValue(newFreq)
  reportParams.value.endDate = getDefaultDateValue(newFreq)
})

// Print State
const printData = ref<any>(null)
const printType = ref<string>('')
const printParams = ref<any>({})
const isFetching = ref(false)

// Download State
const showDownloadMenu = ref(false)
const isDownloading = ref(false)
const downloadFormat = ref<'pdf' | 'docx'>('pdf')

// Click outside handler for download menu
const { elementRef: downloadMenuRef } = useClickOutside(() => {
  showDownloadMenu.value = false
})

const reportBarChartData = computed(() => {
  if (!printData.value || !Array.isArray(printData.value)) return null
  const labels = printData.value.map((d: any) => d.code || d.name)
  const counts = printData.value.map((d: any) => Number(d.entryCount || 0))
  return {
    labels,
    datasets: [{
      label: 'Library Entries',
      data: counts,
      backgroundColor: '#447794',
      borderRadius: 6,
      maxBarThickness: 48,
    }]
  }
})

const showDepartmentColumn = computed(() => {
  return printType.value === 'Library Entry and Exit' &&
         (!printParams.value?.department || printParams.value.department === 'All' || printParams.value.department === 'All Departments')
})

const reportBarChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      padding: 12,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { family: "'Inter', sans-serif", size: 12, weight: 'bold' as const }, color: '#64748b' }
    },
    y: {
      beginAtZero: true,
      ticks: { precision: 0, font: { family: "'Inter', sans-serif", size: 11 }, color: '#94a3b8' },
      grid: { color: '#f1f5f9' }
    }
  }
}

async function viewReport(reportName: string, parameters: any = {}) {
  try {
    isFetching.value = true;
    printType.value = reportName;
    printParams.value = parameters;
    printData.value = null; // reset
    
    let res;
    if (reportName === 'Library Entry and Exit') {
      res = await api.get('/reports/entry-exit', { params: parameters })
    } else if (reportName === 'Department Library Entry') {
      res = await api.get('/reports/department-entry')
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

// ===== Helper Functions for OKLCH Color Fix =====

// Convert OKLCH color string to RGB
function oklchToRgb(oklchStr: string): string | null {
  // Match oklch(L C H) or oklch(L C H / alpha)
  const match = oklchStr.match(/oklch\(([^)]+)\)/)
  if (!match) return null

  const params = match[1].trim().split(/\s+/)
  if (params.length < 3) return null

  const L = parseFloat(params[0])
  const C = parseFloat(params[1])
  const H = parseFloat(params[2])
  const alpha = params[3] ? parseFloat(params[3].replace('/', '')) : 1

  if (isNaN(L) || isNaN(C) || isNaN(H)) return null

  // OKLCH to sRGB conversion (simplified)
  // This is a basic implementation - for production use a proper color space library
  const h = H * Math.PI / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  // OKLab to linear sRGB
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b

  const l3 = l_ * l_ * l_
  const m3 = m_ * m_ * m_
  const s3 = s_ * s_ * s_

  const r = + (4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3)
  const g = + (-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3)
  const b_ = + (-0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3)

  // sRGB gamma correction
  const toSrgb = (c: number) => {
    const linear = Math.max(0, Math.min(1, c))
    return linear <= 0.0031308 ? 12.92 * linear : 1.055 * Math.pow(linear, 1/2.4) - 0.055
  }

  const r255 = Math.round(toSrgb(r) * 255)
  const g255 = Math.round(toSrgb(g) * 255)
  const b255 = Math.round(toSrgb(b_) * 255)

  if (alpha < 1) {
    return `rgba(${r255}, ${g255}, ${b255}, ${alpha})`
  }
  return `rgb(${r255}, ${g255}, ${b255})`
}

// Fix OKLCH colors in a cloned document (for html2canvas onclone callback)
function fixOklchColorsInDoc(clonedDoc: any) {
  const win = clonedDoc.defaultView
  if (!win) return

  // Walk all elements in the cloned document
  const walker = clonedDoc.createTreeWalker(clonedDoc.body, NodeFilter.SHOW_ELEMENT)
  const nodes: HTMLElement[] = []
  let node
  while (node = walker.nextNode()) {
    nodes.push(node as HTMLElement)
  }

  nodes.forEach(el => {
    const computedStyle = win.getComputedStyle(el)
    const colorProps = [
      'color',
      'backgroundColor',
      'borderColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'outlineColor',
      'textDecorationColor',
      'caretColor',
      'accentColor'
    ]

    colorProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop)
      if (value && value.includes('oklch(')) {
        const rgb = oklchToRgb(value)
        if (rgb) {
          el.style.setProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase(), rgb, 'important')
        }
      }
    })

    // Also check inline styles
    const style = el.style
    for (let i = 0; i < style.length; i++) {
      const prop = style[i]
      const value = style.getPropertyValue(prop)
      if (value.includes('oklch(')) {
        const rgb = oklchToRgb(value)
        if (rgb) {
          style.setProperty(prop, rgb, style.getPropertyPriority(prop))
        }
      }
    }
  })
}

// Fix OKLCH colors in an element by replacing CSS variables with computed RGB values
async function fixOklchColorsInElement(element: HTMLElement) {
  // First, copy all CSS custom properties from the original document to the element
  const rootStyles = getComputedStyle(document.documentElement)
  const cssVariables: Record<string, string> = {}

  // Get all CSS custom properties from :root
  for (let i = 0; i < rootStyles.length; i++) {
    const prop = rootStyles[i]
    if (prop.startsWith('--')) {
      cssVariables[prop] = rootStyles.getPropertyValue(prop).trim()
    }
  }

  // Apply CSS variables to the element (and its shadow DOM if any)
  Object.entries(cssVariables).forEach(([prop, value]) => {
    element.style.setProperty(prop, value)
  })

  // Now walk all elements and fix OKLCH colors in computed styles
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT)
  const nodes: HTMLElement[] = []
  let node
  while (node = walker.nextNode()) {
    nodes.push(node as HTMLElement)
  }

  for (const el of nodes) {
    const computedStyle = getComputedStyle(el)
    const colorProps = [
      'color',
      'backgroundColor',
      'borderColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'outlineColor',
      'textDecorationColor',
      'caretColor',
      'accentColor'
    ]

    for (const prop of colorProps) {
      const value = computedStyle.getPropertyValue(prop)
      if (value && value.includes('oklch(')) {
        const rgb = oklchToRgb(value)
        if (rgb) {
          el.style.setProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase(), rgb, 'important')
        }
      }
    }

    // Also check inline styles
    const style = el.style
    for (let i = 0; i < style.length; i++) {
      const prop = style[i]
      const value = style.getPropertyValue(prop)
      if (value.includes('oklch(')) {
        const rgb = oklchToRgb(value)
        if (rgb) {
          style.setProperty(prop, rgb, style.getPropertyPriority(prop))
        }
      }
    }
  }
}

// ===== Download Functions =====

async function downloadReport(format: 'pdf' | 'docx') {
  if (!printData.value || !printType.value) return

  isDownloading.value = true
  showDownloadMenu.value = false

  try {
    if (format === 'pdf') {
      await downloadAsPDF()
    } else {
      await downloadAsDOCX()
    }
  } catch (error) {
    console.error('Download failed:', error)
    alert('Failed to download report. Please try again.')
  } finally {
    isDownloading.value = false
  }
}

async function downloadAsPDF() {
  const element = document.getElementById('report-preview-section')
  if (!element) return

  const letterhead = element.querySelector<HTMLImageElement>('.report-letterhead')
  if (!letterhead) throw new Error('Report letterhead is missing')
  await letterhead.decode()

  const pdf = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const marginX = 12
  const contentWidth = pageWidth - marginX * 2
  const letterheadHeight = pageWidth * letterhead.naturalHeight / letterhead.naturalWidth
  const generatedTime = new Date()
  const generatedAt = `Generated on ${generatedTime.toLocaleDateString()} at ${generatedTime.toLocaleTimeString()}`
  const headers = getTableHeaders(printType.value, printParams.value)
  const rows = getTableDataRows(printType.value, printData.value, printParams.value)
  const table = element.querySelector<HTMLTableElement>('.print-table')
  const headerCells = table?.querySelector<HTMLTableRowElement>('thead tr')?.cells
  const measuredColumnWidths = headerCells && headerCells.length === headers.length
    ? Array.from(headerCells).map(cell => cell.getBoundingClientRect().width)
    : []
  const measuredWidthTotal = measuredColumnWidths.reduce((total, width) => total + width, 0)
  const columnWidths = headers.length > 0
    ? measuredWidthTotal > 0
      ? measuredColumnWidths.map(width => contentWidth * width / measuredWidthTotal)
      : headers.map(() => contentWidth / headers.length)
    : []
  const fontSize = 8
  const lineHeight = 3.6
  const cellPaddingX = 2
  const cellPaddingY = 1.5
  const bottomLimit = pageHeight - 12
  const parameters: string[] = []

  if (printParams.value.frequency) parameters.push(`Frequency: ${printParams.value.frequency}`)
  if (printParams.value.department) parameters.push(`Department: ${printParams.value.department}`)
  if (printParams.value.startDate && printParams.value.endDate) {
    parameters.push(`Period: ${printParams.value.startDate} to ${printParams.value.endDate}`)
  }

  const wrapText = (text: string, width: number) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(fontSize)
    const wrapped = pdf.splitTextToSize(text || '-', Math.max(1, width - cellPaddingX * 2))
    return Array.isArray(wrapped) ? wrapped : [wrapped]
  }

  const drawCell = (
    text: string[],
    x: number,
    y: number,
    width: number,
    height: number,
    color: [number, number, number],
    bold = false,
    fillColor: [number, number, number] = [255, 255, 255]
  ) => {
    pdf.setFillColor(...fillColor)
    pdf.setDrawColor(226, 232, 240)
    pdf.setLineWidth(0.2)
    pdf.rect(x, y, width, height, 'FD')
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(fontSize)
    pdf.setTextColor(...color)

    const textHeight = text.length * lineHeight
    const firstBaseline = y + (height - textHeight) / 2 + lineHeight * 0.78
    text.forEach((line, index) => {
      pdf.text(line, x + width / 2, firstBaseline + index * lineHeight, { align: 'center' })
    })
  }

  const drawPageStart = (pageNumber: number) => {
    pdf.addImage(letterhead, 'JPEG', 0, 0, pageWidth, letterheadHeight)
    let y = letterheadHeight + 5

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(15, 23, 42)
    const title = `Library Report — ${printType.value}${pageNumber > 1 ? ' (continued)' : ''}`
    const titleLines = pdf.splitTextToSize(title, contentWidth)
    titleLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y + 4, { align: 'center' })
      y += 5
    })
    y += 1

    if (pageNumber === 1 && parameters.length > 0) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(fontSize)
      pdf.setTextColor(71, 85, 105)
      const parameterLines = pdf.splitTextToSize(parameters.join('  |  '), contentWidth)
      parameterLines.forEach((line: string) => {
        pdf.text(line, pageWidth / 2, y + 3, { align: 'center' })
        y += lineHeight
      })
      y += 2
    }

    if (pageNumber === 1 && printType.value === 'Department Library Entry') {
      const chart = element.querySelector<HTMLCanvasElement>('.print-section canvas')
      if (chart && chart.width > 0 && chart.height > 0) {
        const chartHeight = Math.min(42, contentWidth * chart.height / chart.width)
        const chartWidth = chartHeight * chart.width / chart.height
        pdf.addImage(chart, 'PNG', (pageWidth - chartWidth) / 2, y, chartWidth, chartHeight)
        y += chartHeight + 3
      }
    }

    if (headers.length > 0) {
      const headerLines = headers.map((header, index) => wrapText(header, columnWidths[index]))
      const headerHeight = Math.max(8, Math.max(...headerLines.map(lines => lines.length)) * lineHeight + cellPaddingY * 2)
      let x = marginX
      headerLines.forEach((lines, index) => {
        drawCell(lines, x, y, columnWidths[index], headerHeight, [51, 65, 85], true, [241, 245, 249])
        x += columnWidths[index]
      })
      y += headerHeight
    }

    return y
  }

  let pageNumber = 1
  let y = drawPageStart(pageNumber)

  if (rows.length === 0) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(fontSize)
    pdf.setTextColor(100, 116, 139)
    pdf.text('No data found for this report.', pageWidth / 2, y + 8, { align: 'center' })
    y += 16
  } else {
    rows.forEach(row => {
      const cellLines = headers.map((header, index) => {
        let value = String(row[index] ?? '-')
        if (header === 'Role' || header === 'Status') {
          value = value.replace(/_/g, ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase())
        }
        return wrapText(value, columnWidths[index])
      })
      const rowHeight = Math.max(7, Math.max(...cellLines.map(lines => lines.length)) * lineHeight + cellPaddingY * 2)

      if (y + rowHeight > bottomLimit) {
        pdf.addPage()
        pageNumber += 1
        y = drawPageStart(pageNumber)
      }

      let x = marginX
      cellLines.forEach((lines, index) => {
        const header = headers[index]
        const value = row[index]?.toLowerCase()
        const color: [number, number, number] = header === 'Status' && value === 'approved'
          ? [5, 150, 105]
          : header === 'Status' && value === 'rejected'
            ? [225, 29, 72]
            : header === 'Status' && value === 'pending'
              ? [217, 119, 6]
              : [51, 65, 85]

        drawCell(lines, x, y, columnWidths[index], rowHeight, color)
        x += columnWidths[index]
      })
      y += rowHeight
    })
  }

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(fontSize)
  pdf.setTextColor(100, 116, 139)
  pdf.text(generatedAt, pageWidth - marginX, pageHeight - 6, { align: 'right' })

  pdf.save(`${printType.value.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
}

async function downloadAsDOCX() {
  if (!printData.value || !printType.value) return

  const letterhead = document.querySelector<HTMLImageElement>('#report-preview-section .report-letterhead')
  if (!letterhead) throw new Error('Report letterhead is missing')
  await letterhead.decode()

  const letterheadResponse = await fetch(letterhead.src)
  if (!letterheadResponse.ok) throw new Error('Failed to load report letterhead')
  const letterheadData = new Uint8Array(await letterheadResponse.arrayBuffer())
  const letterheadWidth = 720
  const letterheadHeight = Math.round(letterheadWidth * letterhead.naturalHeight / letterhead.naturalWidth)
  const reportHeader = new Header({
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            data: letterheadData,
            type: 'jpg',
            transformation: { width: letterheadWidth, height: letterheadHeight },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
      }),
    ],
  })

  const children: any[] = []
  const generatedTime = new Date()

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Library Report — ${printType.value}`,
          bold: true,
          size: 32,
          color: '1a233a',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  )

  // Parameters
  if (printParams.value.frequency || printParams.value.department || printParams.value.startDate) {
    const paramParts = []
    if (printParams.value.frequency) paramParts.push(`Frequency: ${printParams.value.frequency}`)
    if (printParams.value.department) paramParts.push(`Department: ${printParams.value.department}`)
    if (printParams.value.startDate && printParams.value.endDate) paramParts.push(`Period: ${printParams.value.startDate} to ${printParams.value.endDate}`)

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: paramParts.join(' | '),
            size: 18,
            color: '475569',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    )
  }

  // Table data
  const tableRows: TableRow[] = []

  // Create header row based on report type
  const headers = getTableHeaders(printType.value, printParams.value)
  tableRows.push(
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: headers.map(h => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: 'ffffff' })], alignment: AlignmentType.CENTER })],
        shading: { fill: '447794' },
        borders: { top: { style: BorderStyle.SINGLE, size: 1, color: '447794' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: '447794' }, left: { style: BorderStyle.SINGLE, size: 1, color: '447794' }, right: { style: BorderStyle.SINGLE, size: 1, color: '447794' } },
      })),
    })
  )

  // Data rows
  const dataRows = getTableDataRows(printType.value, printData.value, printParams.value)
  dataRows.forEach((row, rowIndex) => {
    tableRows.push(
      new TableRow({
        cantSplit: true,
        children: row.map(cell => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18, color: '1a233a' })], alignment: AlignmentType.CENTER })],
          borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' } },
          shading: rowIndex % 2 === 0 ? { fill: 'f8fafc' } : {},
        })),
      })
    )
  })

  if (tableRows.length > 1) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      })
    )
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'No data found for this report.', italics: true, size: 20, color: '94a3b8' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
      })
    )
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated on ${generatedTime.toLocaleDateString()} at ${generatedTime.toLocaleTimeString()}`,
          size: 20,
          color: '64748b',
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 300 },
    })
  )

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 2200, right: 720, bottom: 720, left: 720, header: 100 },
        },
      },
      headers: { default: reportHeader },
      children: children,
    }],
  })

  const blob = await Packer.toBlob(doc)
  const fileName = `${printType.value.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`
  saveAs(blob, fileName)
}

function getTableHeaders(reportType: string, params?: any): string[] {
  switch (reportType) {
    case 'Library Entry and Exit':
      // Show department column when "All Departments" is selected
      if (!params?.department || params.department === 'All' || params.department === 'All Departments') {
        return ['Period', 'Department', 'Entries', 'Exits']
      }
      return ['Period', 'Entries', 'Exits']
    case 'Department Library Entry':
      return ['Department Code', 'Department Name', 'Total Library Entries']
    case 'Books Borrowed':
    case 'Books Returned':
      return ['Period', 'Book Title', 'Count']
    case 'Overdue Books':
      return ['Period', 'Borrower', 'Book Title', 'Due Date', 'Days Overdue']
    case 'Registered Users':
      return ['Name', 'Email', 'Role', 'Department', 'Status']
    case 'Inventory':
      return ['Book Title', 'ISBN', 'Category', 'Total Copies', 'Available', 'Checked Out']
    case 'New Acquisitions':
      return ['Book Title', 'ISBN', 'Acquisition Date']
    default:
      return []
  }
}

function getTableDataRows(reportType: string, data: any[], params?: any): string[][] {
  if (!data || !data.length) return []

  const showDepartmentColumn = reportType === 'Library Entry and Exit' && (!params?.department || params.department === 'All' || params.department === 'All Departments')

  switch (reportType) {
    case 'Library Entry and Exit':
      if (showDepartmentColumn) {
        return data.map(d => [d.period, d.departmentName || d.departmentCode || 'N/A', String(d.entries), String(d.exits)])
      }
      return data.map(d => [d.period, String(d.entries), String(d.exits)])
    case 'Department Library Entry':
      return data.map(d => [d.code || 'N/A', d.name, String(d.entryCount)])
    case 'Books Borrowed':
      return data.map(d => [d.period, d.title, String(d.borrowCount)])
    case 'Books Returned':
      return data.map(d => [d.period, d.title, String(d.returnCount)])
    case 'Overdue Books':
      return data.map(d => [d.period, `${d.first_name} ${d.last_name}`, d.title, new Date(d.due_date).toLocaleDateString(), String(d.overdue_days)])
    case 'Registered Users':
      return data.map(d => [`${d.first_name} ${d.last_name}`, d.email, (d.role || '').replace('_', ' '), d.department || '-', d.account_approval_status || 'approved'])
    case 'Inventory':
      return data.map(d => [d.title, d.isbn, d.category || 'Uncategorized', String(d.total_copies), String(d.available_copies), String(d.checked_out_copies)])
    case 'New Acquisitions':
      return data.map(d => [d.title, d.isbn, new Date(d.acquisition_date).toLocaleDateString()])
    default:
      return []
  }
}
</script>

<template>
  <div class="reports-container space-y-8 w-full max-w-[1600px] mx-auto p-4 md:p-8 relative">
    
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

    <!-- Unified Report Configuration Form -->
    <div class="card bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 hide-on-print">
      
      <div class="flex items-start gap-4 mb-8 border-b border-slate-100 pb-6">
        <div class="p-3 bg-[#447794]/10 rounded-xl text-[#447794]">
          <FunnelIcon class="w-6 h-6" />
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-800">Report Configuration</h3>
          <p class="text-sm text-slate-500">Select a report type and configure its parameters.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Report Type Dropdown -->
        <div class="col-span-1 md:col-span-3">
          <label class="block text-sm font-semibold text-slate-700 mb-2">Report Type</label>
          <select v-model="selectedReportType" class="w-full rounded-xl border-slate-300 shadow-sm focus:border-[#447794] focus:ring-[#447794] bg-slate-50 outline-none py-3 px-4 transition-colors">
            <option v-for="type in reportTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>
        
        <!-- Dynamic Filters based on selectedReportType -->
        <template v-if="selectedReportType === 'Library Entry and Exit'">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Frequency</label>
            <select v-model="reportParams.frequency" class="w-full rounded-xl border-slate-300 shadow-sm focus:border-[#447794] focus:ring-[#447794] bg-slate-50 outline-none py-3 px-4 transition-colors">
              <option v-for="f in entryFrequencies" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Category</label>
            <select v-model="reportParams.category" class="w-full rounded-xl border-slate-300 shadow-sm focus:border-[#447794] focus:ring-[#447794] bg-slate-50 outline-none py-3 px-4 transition-colors">
              <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Course / Strand</label>
            <select v-model="reportParams.department" class="w-full rounded-xl border-slate-300 shadow-sm focus:border-[#447794] focus:ring-[#447794] bg-slate-50 outline-none py-3 px-4 transition-colors">
              <option v-for="d in filteredDepartments" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block text-sm font-semibold text-slate-700 mb-2">
                Start {{ reportParams.frequency === 'Daily' ? 'Date' : reportParams.frequency === 'Weekly' ? 'Week' : reportParams.frequency === 'Monthly' ? 'Month' : 'Year' }}
              </label>
              <input :type="reportParams.frequency === 'Daily' ? 'date' : reportParams.frequency === 'Weekly' ? 'week' : reportParams.frequency === 'Monthly' ? 'month' : 'number'" v-model="reportParams.startDate" class="w-full rounded-xl border-slate-300 shadow-sm focus:border-[#447794] focus:ring-[#447794] bg-slate-50 outline-none py-3 px-4 transition-colors" />
            </div>
            <div class="flex-1">
              <label class="block text-sm font-semibold text-slate-700 mb-2">
                End {{ reportParams.frequency === 'Daily' ? 'Date' : reportParams.frequency === 'Weekly' ? 'Week' : reportParams.frequency === 'Monthly' ? 'Month' : 'Year' }}
              </label>
              <input :type="reportParams.frequency === 'Daily' ? 'date' : reportParams.frequency === 'Weekly' ? 'week' : reportParams.frequency === 'Monthly' ? 'month' : 'number'" v-model="reportParams.endDate" :min="reportParams.startDate" class="w-full rounded-xl border-slate-300 shadow-sm focus:border-[#447794] focus:ring-[#447794] bg-slate-50 outline-none py-3 px-4 transition-colors" />
            </div>
          </div>
        </template>

        <template v-else-if="['Books Borrowed', 'Books Returned', 'Overdue Books'].includes(selectedReportType)">
          <div class="col-span-1 md:col-span-3">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Frequency</label>
            <select v-model="reportParams.frequency" class="w-full rounded-xl border-slate-300 shadow-sm focus:border-[#447794] focus:ring-[#447794] bg-slate-50 outline-none py-3 px-4 transition-colors">
              <option v-for="f in commonFrequencies" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>
        </template>

        <template v-else>
          <div class="col-span-1 md:col-span-3 flex items-center justify-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
             <span class="text-sm text-slate-500">No additional parameters required for this report.</span>
          </div>
        </template>
      </div>

      <div class="mt-8 flex justify-end pt-6 border-t border-slate-100">
        <button @click="viewReport(selectedReportType, reportParams)" :disabled="isFetching" class="w-full md:w-auto btn-primary bg-[#447794] text-white py-3 px-8 rounded-xl flex items-center justify-center gap-2 hover:bg-[#366179] transition-all font-medium disabled:opacity-50 shadow-lg shadow-[#447794]/20 hover:shadow-xl hover:-translate-y-0.5">
          <DocumentTextIcon class="w-5 h-5" /> View {{ selectedReportType }}
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
          <p class="text-slate-500 text-sm mt-1">Review the generated data below before downloading.</p>
        </div>
        <div class="relative" ref="downloadMenuRef">
          <button
            @click="showDownloadMenu = !showDownloadMenu"
            :disabled="isDownloading"
            class="btn-primary bg-[#447794] text-white py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 hover:bg-[#366179] transition-colors font-medium shadow-lg shadow-[#447794]/20 disabled:opacity-50"
          >
            <ArrowDownTrayIcon class="w-5 h-5" />
            <span>Download</span>
            <ChevronDownIcon class="w-4 h-4" />
          </button>

          <!-- Download Format Dropdown -->
          <div v-if="showDownloadMenu" class="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-fade-in">
            <button
              @click="downloadReport('pdf')"
              :disabled="isDownloading"
              class="w-full px-4 py-2.5 text-left flex items-center gap-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <DocumentArrowDownIcon class="w-5 h-5 text-[#447794]" />
              <span class="font-medium">PDF Document</span>
              <span class="text-xs text-slate-400 ml-auto">.pdf</span>
            </button>
            <button
              @click="downloadReport('docx')"
              :disabled="isDownloading"
              class="w-full px-4 py-2.5 text-left flex items-center gap-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <DocumentArrowDownIcon class="w-5 h-5 text-[#447794]" />
              <span class="font-medium">Word Document</span>
              <span class="text-xs text-slate-400 ml-auto">.docx</span>
            </button>
            <hr class="my-1 border-slate-200" />
            <button
              @click="triggerPrint"
              :disabled="isDownloading"
              class="w-full px-4 py-2.5 text-left flex items-center gap-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <PrinterIcon class="w-5 h-5 text-[#447794]" />
              <span class="font-medium">Print</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Actual Print/Preview Content -->
      <div class="print-section text-slate-800 w-full overflow-x-auto">
        
        <!-- Official Institutional Letterhead Header Banner -->
        <div class="report-letterhead-container mb-6 flex justify-center w-full">
          <img :src="ndcHeader" alt="North Davao Colleges, Inc. Header" class="report-letterhead w-full max-w-4xl h-auto object-contain rounded-lg print:rounded-none" />
        </div>

        <div class="report-print-heading text-center mb-8 border-b-2 border-slate-800 pb-6 print:border-b-4">
          <h1 class="text-2xl print:text-3xl font-bold text-slate-900 mb-1">Library Report — {{ printType }}</h1>
          <p class="report-generated-on text-slate-600 font-medium text-xs print:text-sm">Generated on {{ new Date().toLocaleDateString() }} at {{ new Date().toLocaleTimeString() }}</p>
          
          <div class="mt-3 flex justify-center gap-6 text-xs print:text-sm font-semibold text-slate-700">
             <span v-if="printParams.frequency">Frequency: {{ printParams.frequency }}</span>
             <span v-if="printParams.department">Department: {{ printParams.department }}</span>
             <span v-if="printParams.startDate && printParams.endDate">Period: {{ printParams.startDate }} to {{ printParams.endDate }}</span>
          </div>
        </div>

        <!-- Department Library Entry -->
        <div v-if="printType === 'Department Library Entry'" class="space-y-8">
          <div class="h-64 w-full max-w-3xl mx-auto bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
            <Bar v-if="reportBarChartData" :data="reportBarChartData" :options="reportBarChartOptions" />
          </div>

          <table class="w-full text-left border-collapse text-sm print:text-base print-table min-w-[600px]">
            <thead>
              <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
                <th class="py-3 px-4">Department Code</th>
                <th class="py-3 px-4">Department Name</th>
                <th class="py-3 px-4 text-right">Total Library Entries</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in printData" :key="idx" class="border-b border-slate-200 hover:bg-slate-50">
                <td class="py-3 px-4 font-bold text-slate-800">{{ row.code || 'N/A' }}</td>
                <td class="py-3 px-4 font-medium">{{ row.name }}</td>
                <td class="py-3 px-4 text-right font-bold text-[#447794]">{{ row.entryCount }}</td>
              </tr>
              <tr v-if="!printData || !printData.length"><td colspan="3" class="py-8 text-center text-slate-500 italic border-b border-slate-200">No department attendance data found.</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Entry Exit -->
        <table v-if="printType === 'Library Entry and Exit'" class="w-full text-left border-collapse text-sm print:text-base print-table min-w-[600px]">
          <thead>
            <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
              <th class="py-3 px-4">Period</th>
              <th v-if="showDepartmentColumn" class="py-3 px-4">Department</th>
              <th class="py-3 px-4 text-right">Entries</th>
              <th class="py-3 px-4 text-right">Exits</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in printData" :key="idx" class="border-b border-slate-200 hover:bg-slate-50">
              <td class="py-3 px-4 font-medium">{{ row.period }}</td>
              <td v-if="showDepartmentColumn" class="py-3 px-4">{{ row.departmentName || row.departmentCode || 'N/A' }}</td>
              <td class="py-3 px-4 text-right">{{ row.entries }}</td>
              <td class="py-3 px-4 text-right">{{ row.exits }}</td>
            </tr>
            <tr v-if="!printData || !printData.length"><td :colspan="showDepartmentColumn ? 4 : 3" class="py-8 text-center text-slate-500 italic border-b border-slate-200">No data found for this period.</td></tr>
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
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in printData" :key="idx" class="border-b border-slate-200 hover:bg-slate-50">
              <td class="py-3 px-4 whitespace-nowrap">{{ row.period }}</td>
              <td class="py-3 px-4 font-medium">{{ row.first_name }} {{ row.last_name }}</td>
              <td class="py-3 px-4">{{ row.title }}</td>
              <td class="py-3 px-4 whitespace-nowrap">{{ new Date(row.due_date).toLocaleDateString() }}</td>
              <td class="py-3 px-4 text-right font-bold text-rose-600">{{ row.overdue_days }}</td>
            </tr>
            <tr v-if="!printData || !printData.length"><td colspan="5" class="py-8 text-center text-slate-500 italic border-b border-slate-200">No overdue books found.</td></tr>
          </tbody>
        </table>

        <!-- Registered Users -->
        <table v-if="printType === 'Registered Users'" class="w-full text-left border-collapse text-sm print:text-base print-table report-registered-users-table min-w-[600px]">
          <thead>
            <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
              <th class="py-3 px-4">Name</th>
              <th class="py-3 px-4">Email</th>
              <th class="py-3 px-4">Role</th>
              <th class="py-3 px-4">Department</th>
              <th class="py-3 px-4">Status</th>
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
              <td class="py-3 px-4 capitalize">
                <span :class="{
                  'text-amber-600 bg-amber-50': row.account_approval_status === 'pending',
                  'text-emerald-600 bg-emerald-50': row.account_approval_status === 'approved',
                  'text-rose-600 bg-rose-50': row.account_approval_status === 'rejected'
                }" class="px-2.5 py-1 rounded-md text-xs font-semibold print:bg-transparent print:p-0 print:text-sm">
                  {{ row.account_approval_status || 'approved' }}
                </span>
              </td>
            </tr>
            <tr v-if="!printData || !printData.length"><td colspan="5" class="py-8 text-center text-slate-500 italic border-b border-slate-200">No users found.</td></tr>
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

        <p class="report-print-generated-at">
          Generated on {{ new Date().toLocaleDateString() }} at {{ new Date().toLocaleTimeString() }}
        </p>
        
      </div>
    </div>

  </div>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.15s ease-out;
}

.print-table tr {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}

.report-print-generated-at {
  display: none;
}

@page {
  size: letter;
  margin: 0;
}

@media print {
  :global(html),
  :global(body),
  :global(#app) {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
  }
  :global(#app > .min-h-screen) {
    box-sizing: border-box !important;
    width: 100% !important;
    min-height: 0 !important;
    padding-left: 0 !important;
    margin: 0 !important;
  }
  :global(#app > .min-h-screen > main) {
    box-sizing: border-box !important;
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .hide-on-print {
    display: none !important;
  }
  .reports-container {
    box-sizing: border-box !important;
    display: block !important;
    position: static !important;
    width: 100% !important;
    max-width: 100% !important;
    background: white !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .reports-container > :not(:first-child) {
    margin-top: 0 !important;
  }
  #report-preview-section {
    box-sizing: border-box !important;
    display: block !important;
    width: 100% !important;
    max-width: none !important;
    padding: 0 2mm 8mm !important;
    margin-top: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  .report-letterhead-container {
    display: block !important;
    position: static !important;
    box-sizing: border-box !important;
    width: calc(100% + 4mm) !important;
    max-width: none !important;
    margin: 0 -2mm 6mm !important;
    padding: 0 !important;
  }
  .print-section {
    display: block !important;
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: 100% !important;
    overflow: visible !important;
  }
  .report-letterhead {
    display: block !important;
    width: 100% !important;
    height: auto !important;
    max-width: none !important;
    border-radius: 0 !important;
  }
  .report-print-heading {
    break-after: avoid !important;
    margin: 0 0 6mm !important;
    padding: 0 0 3mm !important;
    border-bottom-width: 1pt !important;
  }
  .report-generated-on {
    display: none !important;
  }
  .report-print-generated-at {
    display: block !important;
    margin-top: 6mm !important;
    text-align: right !important;
    font-size: 8pt !important;
    color: #64748b !important;
    break-inside: avoid !important;
  }
  .report-print-heading h1 {
    font-size: 16pt !important;
    line-height: 1.2 !important;
  }
  .report-print-heading > div {
    flex-wrap: wrap !important;
    gap: 2mm 6mm !important;
    margin-top: 3mm !important;
  }
  .print-section .h-64 {
    box-sizing: border-box !important;
    height: 55mm !important;
    max-width: 170mm !important;
    margin: 0 auto 6mm !important;
    padding: 2mm !important;
  }
  .print-table {
    display: table !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    table-layout: fixed !important;
    font-size: 8pt !important;
    margin: 0 auto !important;
    border-collapse: collapse !important;
  }
  .print-table th,
  .print-table td {
    box-sizing: border-box !important;
    padding: 3pt 4pt !important;
    white-space: normal !important;
    overflow-wrap: anywhere;
    text-align: center !important;
    border: 0.75pt solid #dbe2ea !important;
    line-height: 1.25 !important;
  }
  .report-registered-users-table th,
  .report-registered-users-table td {
    padding: 5pt 6pt !important;
    font-size: 9pt !important;
  }
  .report-registered-users-table th:nth-child(1),
  .report-registered-users-table td:nth-child(1) {
    width: 22% !important;
  }
  .report-registered-users-table th:nth-child(2),
  .report-registered-users-table td:nth-child(2) {
    width: 38% !important;
  }
  .report-registered-users-table th:nth-child(3),
  .report-registered-users-table td:nth-child(3) {
    width: 12% !important;
  }
  .report-registered-users-table th:nth-child(4),
  .report-registered-users-table td:nth-child(4) {
    width: 14% !important;
  }
  .report-registered-users-table th:nth-child(5),
  .report-registered-users-table td:nth-child(5) {
    width: 14% !important;
  }
  .print-table thead {
    display: table-header-group !important;
  }
  .print-table tr {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  .print-section .text-center > .flex {
    flex-wrap: wrap;
  }
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    background: white !important;
  }
  .print-table th {
    background-color: #f1f5f9 !important; /* slate-100 */
    color: #334155 !important;
    font-weight: 700 !important;
  }
}
</style>

