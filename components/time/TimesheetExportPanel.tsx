'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, FileText, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subWeeks, subMonths, format, isAfter
} from 'date-fns'
import { CATEGORY_LABELS, formatCurrency, formatHours } from '@/lib/utils'
import type { TimeEntry, CategoryType, Client, Property } from '@/types'

type DatePreset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom'

const PRESET_LABELS: Record<DatePreset, string> = {
  this_week: 'This Week',
  last_week: 'Last Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  custom: 'Custom',
}

const CATEGORIES: CategoryType[] = ['client_work', 'drive_time', 'errand', 'prep', 'admin', 'equipment_maint']

function getPresetRange(preset: DatePreset): { start: string; end: string } {
  const now = new Date()
  let start: Date
  let end: Date

  switch (preset) {
    case 'this_week':
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
      break
    case 'last_week':
      start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      break
    case 'this_month':
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
    case 'last_month':
      start = startOfMonth(subMonths(now, 1))
      end = endOfMonth(subMonths(now, 1))
      break
    default:
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
  }

  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

function buildQueryParams(filters: {
  startDate: string
  endDate: string
  clientId: string
  propertyId: string
  billableOnly: boolean
  category: string
}): string {
  const params = new URLSearchParams()
  params.set('start_date', filters.startDate)
  params.set('end_date', filters.endDate)
  if (filters.clientId) params.set('client_id', filters.clientId)
  if (filters.propertyId) params.set('property_id', filters.propertyId)
  if (filters.billableOnly) params.set('billable_only', 'true')
  if (filters.category) params.set('category', filters.category)
  return params.toString()
}

function generateCSV(entries: TimeEntry[]): string {
  const headers = [
    'date', 'day_of_week', 'start_time', 'end_time', 'duration_minutes',
    'duration_hours', 'client', 'property', 'job', 'category', 'billable',
    'hourly_rate', 'billable_amount', 'notes',
  ]

  const rows = entries.map(entry => {
    const startDate = new Date(entry.start_time)
    const endDate = entry.end_time ? new Date(entry.end_time) : null
    const durationHours = entry.duration_minutes ? Math.round((entry.duration_minutes / 60) * 100) / 100 : 0

    return [
      format(startDate, 'yyyy-MM-dd'),
      format(startDate, 'EEEE'),
      format(startDate, 'HH:mm'),
      endDate ? format(endDate, 'HH:mm') : '',
      entry.duration_minutes ?? 0,
      durationHours,
      entry.client?.name ?? '',
      entry.property?.name ?? '',
      entry.job?.title ?? '',
      CATEGORY_LABELS[entry.category] ?? entry.category,
      entry.billable ? 'Yes' : 'No',
      entry.hourly_rate ?? '',
      entry.billable_amount ?? '',
      (entry.notes ?? '').replace(/"/g, '""'),
    ]
  })

  const escape = (v: string | number) => {
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s}"`
    }
    return s
  }

  return [
    headers.join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ].join('\n')
}

function generateTimecardCSV(entries: TimeEntry[]): string {
  const headers = [
    'Employee number', 'First name', 'Last name', 'Job title',
    'Clockin date', 'Clockin time', 'Clockout date', 'Clockout time',
    'Total paid hours', 'Hourly wage', 'Total labor cost',
  ]

  const escape = (v: string | number) => {
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s}"`
    }
    return s
  }

  // Group entries by job title (property name or job title)
  const grouped: Record<string, TimeEntry[]> = {}
  for (const entry of entries) {
    const jobTitle = entry.property?.name || entry.job?.title || entry.client?.name || 'General'
    if (!grouped[jobTitle]) grouped[jobTitle] = []
    grouped[jobTitle].push(entry)
  }

  const lines: string[] = [headers.map(escape).join(',')]
  let grandTotalHours = 0
  let grandTotalCost = 0

  for (const jobTitle of Object.keys(grouped).sort()) {
    const group = grouped[jobTitle]
    let groupHours = 0
    let groupCost = 0

    for (const entry of group) {
      const start = new Date(entry.start_time)
      const end = entry.end_time ? new Date(entry.end_time) : null
      const hours = entry.duration_minutes
        ? Math.round((entry.duration_minutes / 60) * 100) / 100
        : 0
      const rate = entry.hourly_rate ?? 0
      const cost = Math.round(hours * Number(rate) * 100) / 100

      groupHours += hours
      groupCost += cost

      lines.push([
        '',
        'Ethan',
        'NOVAK',
        jobTitle,
        format(start, 'M/d/yy'),
        format(start, 'h:mm:ss a'),
        end ? format(end, 'M/d/yy') : '',
        end ? format(end, 'h:mm:ss a') : '',
        hours,
        rate ? `$${Number(rate).toFixed(2)}` : '',
        cost ? `$${cost.toFixed(2)}` : '',
      ].map(escape).join(','))
    }

    // Subtotal row
    grandTotalHours += groupHours
    grandTotalCost += groupCost
    lines.push([
      'Total', '', '', '', '', '', '', '',
      Math.round(groupHours * 100) / 100,
      '',
      `$${groupCost.toFixed(2)}`,
    ].map(escape).join(','))
    lines.push('') // blank row between groups
  }

  // Grand total
  lines.push([
    '', '', '', '', '', '', '', '',
    Math.round(grandTotalHours * 100) / 100,
    '',
    `$${grandTotalCost.toFixed(2)}`,
  ].map(escape).join(','))

  return lines.join('\n')
}

function downloadBlob(content: BlobPart, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function generatePDF(
  entries: TimeEntry[],
  startDate: string,
  endDate: string,
) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  const autoTableDoc = doc as typeof doc & {
    autoTable: (options: {
      startY: number
      head: string[][]
      body: string[][]
      theme: 'striped'
      styles: { fontSize: number; cellPadding: number }
      headStyles: { fillColor: number[]; textColor: number[]; fontSize: number }
      margin: { left: number; right: number }
      didDrawPage: () => void
    }) => void
    lastAutoTable: { finalY: number }
  }

  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const totalHours = totalMinutes / 60
  const billableEntries = entries.filter(e => e.billable)
  const billableMinutes = billableEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const nonBillableMinutes = totalMinutes - billableMinutes
  const totalBillable = entries.reduce((s, e) => s + (e.billable_amount || 0), 0)

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Nova Horizon Services LLC', 14, 18)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  const rangeLabel = `${format(new Date(startDate + 'T12:00:00'), 'MMM d, yyyy')} - ${format(new Date(endDate + 'T12:00:00'), 'MMM d, yyyy')}`
  doc.text(`Timesheet: ${rangeLabel}`, 14, 25)

  doc.setFontSize(10)
  doc.text(`Total Hours: ${formatHours(totalHours)}`, 14, 32)
  doc.text(`Billable: ${formatHours(billableMinutes / 60)} | Non-Billable: ${formatHours(nonBillableMinutes / 60)}`, 14, 37)
  doc.text(`Total Billable Amount: ${formatCurrency(totalBillable)}`, 14, 42)
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 47)

  // Group entries by client -> property
  const grouped: Record<string, Record<string, TimeEntry[]>> = {}
  for (const entry of entries) {
    const clientName = entry.client?.name || 'No Client'
    const propertyName = entry.property?.name || 'No Property'
    if (!grouped[clientName]) grouped[clientName] = {}
    if (!grouped[clientName][propertyName]) grouped[clientName][propertyName] = []
    grouped[clientName][propertyName].push(entry)
  }

  let yPos = 54

  const sortedClients = Object.keys(grouped).sort()

  for (const clientName of sortedClients) {
    const properties = grouped[clientName]
    const clientEntries = Object.values(properties).flat()
    const clientMinutes = clientEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0)
    const clientBillable = clientEntries.reduce((s, e) => s + (e.billable_amount || 0), 0)

    // Check if we need a new page
    if (yPos > 170) {
      doc.addPage()
      yPos = 14
    }

    // Client header
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(clientName, 14, yPos)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${formatHours(clientMinutes / 60)} total | ${formatCurrency(clientBillable)} billable`,
      14, yPos + 5,
    )
    yPos += 10

    const sortedProperties = Object.keys(properties).sort()

    for (const propertyName of sortedProperties) {
      const propEntries = properties[propertyName]

      if (yPos > 170) {
        doc.addPage()
        yPos = 14
      }

      if (sortedProperties.length > 1 || propertyName !== 'No Property') {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`  ${propertyName}`, 14, yPos)
        yPos += 5
      }

      const tableBody = propEntries.map(entry => {
        const start = new Date(entry.start_time)
        const end = entry.end_time ? new Date(entry.end_time) : null
        return [
          format(start, 'MM/dd'),
          format(start, 'EEE'),
          format(start, 'h:mm a'),
          end ? format(end, 'h:mm a') : '',
          formatHours((entry.duration_minutes || 0) / 60),
          entry.job?.title || '',
          CATEGORY_LABELS[entry.category] || entry.category,
          entry.billable ? 'Yes' : 'No',
          entry.hourly_rate ? `$${entry.hourly_rate}` : '',
          entry.billable_amount ? formatCurrency(entry.billable_amount) : '',
          (entry.notes || '').substring(0, 40),
        ]
      })

      autoTableDoc.autoTable({
        startY: yPos,
        head: [['Date', 'Day', 'Start', 'End', 'Duration', 'Job', 'Category', 'Bill?', 'Rate', 'Amount', 'Notes']],
        body: tableBody,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
        margin: { left: 14, right: 14 },
        didDrawPage: () => {},
      })

      yPos = autoTableDoc.lastAutoTable.finalY + 6
    }

    // Client subtotal line
    if (yPos > 180) {
      doc.addPage()
      yPos = 14
    }
    doc.setDrawColor(100, 116, 139)
    doc.line(14, yPos - 2, 265, yPos - 2)
    yPos += 4
  }

  // Grand total
  if (yPos > 170) {
    doc.addPage()
    yPos = 14
  }
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Grand Total', 14, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Hours: ${formatHours(totalHours)}  |  Billable: ${formatHours(billableMinutes / 60)}  |  Non-Billable: ${formatHours(nonBillableMinutes / 60)}`, 14, yPos + 5)
  doc.text(`Total Billable Amount: ${formatCurrency(totalBillable)}`, 14, yPos + 10)

  return doc.output('arraybuffer')
}

export default function TimesheetExportPanel() {
  const [preset, setPreset] = useState<DatePreset>('this_week')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [clientId, setClientId] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [billableOnly, setBillableOnly] = useState(false)
  const [category, setCategory] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [properties, setProperties] = useState<(Property & { client?: Client })[]>([])
  const [csvFormat, setCsvFormat] = useState<'detailed' | 'timecard'>('timecard')
  const [loading, setLoading] = useState<'csv' | 'pdf' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [entryCount, setEntryCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d || [])).catch(() => {})
    fetch('/api/properties').then(r => r.json()).then(d => setProperties(d || [])).catch(() => {})
  }, [])

  const getDateRange = useCallback(() => {
    if (preset === 'custom') {
      return { start: customStart, end: customEnd }
    }
    return getPresetRange(preset)
  }, [preset, customStart, customEnd])

  const range = getDateRange()
  const hasValidRange = Boolean(range.start && range.end)

  // Preview count when filters change
  useEffect(() => {
    if (!hasValidRange) return

    const qs = buildQueryParams({
      startDate: range.start,
      endDate: range.end,
      clientId,
      propertyId,
      billableOnly,
      category,
    })

    let cancelled = false

    fetch(`/api/time-entries?${qs}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && Array.isArray(data)) setEntryCount(data.length)
      })
      .catch(() => {
        if (!cancelled) setEntryCount(null)
      })

    return () => {
      cancelled = true
    }
  }, [range.start, range.end, clientId, propertyId, billableOnly, category, hasValidRange])

  const filteredProperties = clientId
    ? properties.filter(p => p.client_id === clientId)
    : properties

  const validateAndFetch = async (): Promise<TimeEntry[] | null> => {
    setError(null)
    if (!range.start || !range.end) {
      setError('Please select a valid date range.')
      return null
    }
    if (preset === 'custom' && isAfter(new Date(range.start), new Date(range.end))) {
      setError('Start date must be before end date.')
      return null
    }
    const qs = buildQueryParams({
      startDate: range.start,
      endDate: range.end,
      clientId,
      propertyId,
      billableOnly,
      category,
    })
    const res = await fetch(`/api/time-entries?${qs}`)
    if (!res.ok) {
      setError('Failed to fetch time entries.')
      return null
    }
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) {
      setError('No time entries found for the selected filters.')
      return null
    }
    return data as TimeEntry[]
  }

  const handleCSV = async () => {
    setLoading('csv')
    try {
      const entries = await validateAndFetch()
      if (!entries) { setLoading(null); return }
      const range = getDateRange()
      const csv = csvFormat === 'timecard' ? generateTimecardCSV(entries) : generateCSV(entries)
      const filename = `timesheet_${range.start}_${range.end}.csv`
      downloadBlob(csv, filename, 'text/csv;charset=utf-8;')
    } catch {
      setError('Failed to generate CSV.')
    }
    setLoading(null)
  }

  const handlePDF = async () => {
    setLoading('pdf')
    try {
      const entries = await validateAndFetch()
      if (!entries) { setLoading(null); return }
      const range = getDateRange()
      const pdfBytes = await generatePDF(entries, range.start, range.end)
      const filename = `timesheet_${range.start}_${range.end}.pdf`
      downloadBlob(pdfBytes, filename, 'application/pdf')
    } catch {
      setError('Failed to generate PDF.')
    }
    setLoading(null)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
        <Download className="w-4 h-4 text-slate-400" />
        <h2 className="font-semibold text-white">Timesheet Export</h2>
        {hasValidRange && entryCount !== null && (
          <span className="ml-auto text-xs text-slate-500">
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'} matched
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Date range presets */}
        <div>
          <label className="block text-xs text-slate-500 mb-2">Date Range</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRESET_LABELS) as DatePreset[]).map(p => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  preset === p
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {PRESET_LABELS[p]}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Start</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">End</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {preset !== 'custom' && (
            <p className="text-xs text-slate-600 mt-2">
              {format(new Date(range.start + 'T12:00:00'), 'MMM d, yyyy')} &ndash;{' '}
              {format(new Date(range.end + 'T12:00:00'), 'MMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Client</label>
            <select
              value={clientId}
              onChange={e => { setClientId(e.target.value); setPropertyId('') }}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Property</label>
            <select
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Properties</option>
              {filteredProperties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.client && !clientId ? ` (${p.client.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors w-full">
              <input
                type="checkbox"
                checked={billableOnly}
                onChange={e => setBillableOnly(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-300">Billable only</span>
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* CSV Format */}
        <div>
          <label className="block text-xs text-slate-500 mb-2">CSV Format</label>
          <div className="flex gap-2">
            <button
              onClick={() => setCsvFormat('timecard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                csvFormat === 'timecard'
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              Timecard (Payroll)
            </button>
            <button
              onClick={() => setCsvFormat('detailed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                csvFormat === 'detailed'
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleCSV}
            disabled={loading !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {loading === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export CSV
          </button>
          <button
            onClick={handlePDF}
            disabled={loading !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {loading === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}
