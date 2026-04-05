import type {
  Client, Property, Job, TimeEntry, Task, CalendarBlock, SquareInvoice
} from '@/types'

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1', name: 'Miller Family', email: 'tom@millerfamily.com',
    phone: '(406) 555-0112', default_hourly_rate: 85,
    notes: 'Tom & Sarah. Prefer morning appointments.', created_at: '2025-03-15T00:00:00Z',
  },
  {
    id: 'c2', name: 'Lakeside Properties LLC', email: 'erik@lakesideprops.com',
    phone: '(406) 555-0234', default_hourly_rate: 75,
    notes: 'Managed by Erik. Two properties: Lodge and Den.', created_at: '2025-01-10T00:00:00Z',
  },
  {
    id: 'c3', name: 'Mountain View Estate', email: 'contact@mountainviewmt.com',
    phone: '(406) 555-0378', default_hourly_rate: 95,
    notes: 'Anderson family. Seasonal opening/closing each year.', created_at: '2025-04-20T00:00:00Z',
  },
  {
    id: 'c4', name: 'Johnson Residence', email: 'mark.johnson@gmail.com',
    phone: '(406) 555-0491', default_hourly_rate: 80,
    notes: 'Mark & Lisa. Bi-weekly maintenance.', created_at: '2025-06-01T00:00:00Z',
  },
]

export const MOCK_PROPERTIES: Property[] = [
  { id: 'p1', client_id: 'c1', name: 'Miller Home', address: '123 Oak Street, Whitefish, MT 59937', type: 'residential' },
  { id: 'p2', client_id: 'c2', name: 'Lakeside Main Lodge', address: '45 Lakeshore Drive, Bigfork, MT 59911', type: 'vacation_rental' },
  { id: 'p3', client_id: 'c2', name: 'Lakeside Den', address: '47 Lakeshore Drive, Bigfork, MT 59911', type: 'vacation_rental' },
  { id: 'p4', client_id: 'c3', name: 'Mountain View Main House', address: '890 Summit Road, Kalispell, MT 59901', type: 'residential' },
  { id: 'p5', client_id: 'c3', name: 'Mountain View Guest Cabin', address: '892 Summit Road, Kalispell, MT 59901', type: 'vacation_rental' },
  { id: 'p6', client_id: 'c4', name: 'Johnson Home', address: '234 Maple Avenue, Columbia Falls, MT 59912', type: 'residential' },
]

export const MOCK_JOBS: Job[] = [
  { id: 'j1', client_id: 'c1', property_id: 'p1', title: 'Spring Lawn Maintenance', status: 'active', target_rate: 85, description: 'Full spring startup: aeration, seeding, first mow, fertilizer application.', created_at: '2026-03-20T00:00:00Z' },
  { id: 'j2', client_id: 'c2', property_id: 'p2', title: 'Main Lodge Deck Repair', status: 'active', target_rate: 75, description: 'Replace rotted deck boards, sand and restain full deck surface.', created_at: '2026-03-28T00:00:00Z' },
  { id: 'j3', client_id: 'c3', property_id: 'p4', title: 'Seasonal Property Opening', status: 'active', target_rate: 95, description: 'Full opening checklist: water system startup, HVAC filters, exterior walkthrough, debris cleanup.', created_at: '2026-04-01T00:00:00Z' },
  { id: 'j4', client_id: 'c4', property_id: 'p6', title: 'Gutter Cleaning & Downspout Check', status: 'complete', target_rate: 80, description: 'Clear all gutters and downspouts. Check for damage.', created_at: '2026-03-15T00:00:00Z', completed_at: '2026-03-22T00:00:00Z' },
  { id: 'j5', client_id: 'c2', property_id: 'p3', title: 'Den HVAC Filter Replacement', status: 'active', target_rate: 75, description: 'Inspect and replace all HVAC filters. Check thermostat calibration.', created_at: '2026-03-30T00:00:00Z' },
  { id: 'j6', client_id: 'c1', property_id: 'p1', title: 'Irrigation System Startup', status: 'active', target_rate: 85, description: 'Pressurize and test all irrigation zones. Adjust heads and timers.', created_at: '2026-04-01T00:00:00Z' },
  { id: 'j7', client_id: 'c3', property_id: 'p4', title: 'Spring Landscaping', status: 'active', target_rate: 95, description: 'Prune ornamental trees, edge beds, apply fresh mulch in all garden areas.', created_at: '2026-04-02T00:00:00Z' },
  { id: 'j8', client_id: 'c4', property_id: 'p6', title: 'Window Washing — Interior & Exterior', status: 'complete', target_rate: 80, description: 'All windows inside and out.', created_at: '2026-03-10T00:00:00Z', completed_at: '2026-03-12T00:00:00Z' },
]

export const MOCK_TIME_ENTRIES: TimeEntry[] = [
  // Mon Mar 30
  { id: 'te1', job_id: 'j1', client_id: 'c1', category: 'drive_time', start_time: '2026-03-30T08:00:00Z', end_time: '2026-03-30T08:25:00Z', duration_minutes: 25, billable: false, rate: 0, notes: 'Drive to Miller Home', created_at: '2026-03-30T08:00:00Z' },
  { id: 'te2', job_id: 'j1', client_id: 'c1', category: 'client_work', start_time: '2026-03-30T08:30:00Z', end_time: '2026-03-30T11:00:00Z', duration_minutes: 150, billable: true, rate: 85, notes: 'Aeration and overseeding', created_at: '2026-03-30T11:00:00Z' },
  { id: 'te3', job_id: 'j5', client_id: 'c2', category: 'drive_time', start_time: '2026-03-30T11:30:00Z', end_time: '2026-03-30T12:15:00Z', duration_minutes: 45, billable: false, rate: 0, notes: 'Drive to Lakeside Den', created_at: '2026-03-30T12:15:00Z' },
  { id: 'te4', job_id: 'j5', client_id: 'c2', category: 'client_work', start_time: '2026-03-30T12:30:00Z', end_time: '2026-03-30T14:00:00Z', duration_minutes: 90, billable: true, rate: 75, notes: 'Replaced 6 HVAC filters, checked thermostat', created_at: '2026-03-30T14:00:00Z' },
  { id: 'te5', job_id: undefined, client_id: undefined, category: 'errand', start_time: '2026-03-30T14:30:00Z', end_time: '2026-03-30T15:15:00Z', duration_minutes: 45, billable: false, rate: 0, notes: 'Hardware store — deck screws and stain for j2', created_at: '2026-03-30T15:15:00Z' },
  // Tue Mar 31
  { id: 'te6', job_id: 'j2', client_id: 'c2', category: 'prep', start_time: '2026-03-31T07:30:00Z', end_time: '2026-03-31T08:00:00Z', duration_minutes: 30, billable: false, rate: 0, notes: 'Load truck with supplies', created_at: '2026-03-31T08:00:00Z' },
  { id: 'te7', job_id: 'j2', client_id: 'c2', category: 'drive_time', start_time: '2026-03-31T08:00:00Z', end_time: '2026-03-31T08:45:00Z', duration_minutes: 45, billable: false, rate: 0, notes: 'Drive to Main Lodge', created_at: '2026-03-31T08:45:00Z' },
  { id: 'te8', job_id: 'j2', client_id: 'c2', category: 'client_work', start_time: '2026-03-31T09:00:00Z', end_time: '2026-03-31T13:30:00Z', duration_minutes: 270, billable: true, rate: 75, notes: 'Pulled rotted boards, installed 40 new cedar planks', created_at: '2026-03-31T13:30:00Z' },
  { id: 'te9', job_id: 'j2', client_id: 'c2', category: 'client_work', start_time: '2026-03-31T14:00:00Z', end_time: '2026-03-31T16:30:00Z', duration_minutes: 150, billable: true, rate: 75, notes: 'Sanded deck surface, first coat of stain', created_at: '2026-03-31T16:30:00Z' },
  // Wed Apr 1
  { id: 'te10', job_id: 'j3', client_id: 'c3', category: 'drive_time', start_time: '2026-04-01T08:00:00Z', end_time: '2026-04-01T09:00:00Z', duration_minutes: 60, billable: false, rate: 0, notes: 'Drive to Mountain View', created_at: '2026-04-01T09:00:00Z' },
  { id: 'te11', job_id: 'j3', client_id: 'c3', category: 'client_work', start_time: '2026-04-01T09:15:00Z', end_time: '2026-04-01T12:00:00Z', duration_minutes: 165, billable: true, rate: 95, notes: 'Water system startup — all zones good', created_at: '2026-04-01T12:00:00Z' },
  { id: 'te12', job_id: 'j3', client_id: 'c3', category: 'client_work', start_time: '2026-04-01T12:30:00Z', end_time: '2026-04-01T14:00:00Z', duration_minutes: 90, billable: true, rate: 95, notes: 'HVAC filters, furnace inspection', created_at: '2026-04-01T14:00:00Z' },
  { id: 'te13', job_id: undefined, client_id: undefined, category: 'admin', start_time: '2026-04-01T15:00:00Z', end_time: '2026-04-01T16:00:00Z', duration_minutes: 60, billable: false, rate: 0, notes: 'Invoice catch-up, Square reconciliation', created_at: '2026-04-01T16:00:00Z' },
  // Thu Apr 2
  { id: 'te14', job_id: 'j6', client_id: 'c1', category: 'prep', start_time: '2026-04-02T07:45:00Z', end_time: '2026-04-02T08:15:00Z', duration_minutes: 30, billable: false, rate: 0, notes: 'Gather irrigation tools', created_at: '2026-04-02T08:15:00Z' },
  { id: 'te15', job_id: 'j6', client_id: 'c1', category: 'drive_time', start_time: '2026-04-02T08:15:00Z', end_time: '2026-04-02T08:40:00Z', duration_minutes: 25, billable: false, rate: 0, notes: 'Drive to Miller Home', created_at: '2026-04-02T08:40:00Z' },
  { id: 'te16', job_id: 'j6', client_id: 'c1', category: 'client_work', start_time: '2026-04-02T08:45:00Z', end_time: '2026-04-02T11:30:00Z', duration_minutes: 165, billable: true, rate: 85, notes: 'Pressurized all zones, fixed 2 broken heads in zone 4', created_at: '2026-04-02T11:30:00Z' },
  { id: 'te17', job_id: 'j7', client_id: 'c3', category: 'drive_time', start_time: '2026-04-02T12:30:00Z', end_time: '2026-04-02T13:30:00Z', duration_minutes: 60, billable: false, rate: 0, notes: 'Drive to Mountain View', created_at: '2026-04-02T13:30:00Z' },
  { id: 'te18', job_id: 'j7', client_id: 'c3', category: 'client_work', start_time: '2026-04-02T13:45:00Z', end_time: '2026-04-02T17:00:00Z', duration_minutes: 195, billable: true, rate: 95, notes: 'Pruning ornamental trees, bed edging', created_at: '2026-04-02T17:00:00Z' },
  // Fri Apr 3
  { id: 'te19', job_id: 'j1', client_id: 'c1', category: 'drive_time', start_time: '2026-04-03T08:00:00Z', end_time: '2026-04-03T08:25:00Z', duration_minutes: 25, billable: false, rate: 0, notes: 'Drive to Miller', created_at: '2026-04-03T08:25:00Z' },
  { id: 'te20', job_id: 'j1', client_id: 'c1', category: 'client_work', start_time: '2026-04-03T08:30:00Z', end_time: '2026-04-03T10:30:00Z', duration_minutes: 120, billable: true, rate: 85, notes: 'First mow of season, fertilizer application', created_at: '2026-04-03T10:30:00Z' },
  { id: 'te21', job_id: 'j2', client_id: 'c2', category: 'drive_time', start_time: '2026-04-03T11:00:00Z', end_time: '2026-04-03T11:45:00Z', duration_minutes: 45, billable: false, rate: 0, notes: 'Drive to Lakeside Lodge', created_at: '2026-04-03T11:45:00Z' },
  { id: 'te22', job_id: 'j2', client_id: 'c2', category: 'client_work', start_time: '2026-04-03T12:00:00Z', end_time: '2026-04-03T15:00:00Z', duration_minutes: 180, billable: true, rate: 75, notes: 'Second coat of deck stain, touch-up trim', created_at: '2026-04-03T15:00:00Z' },
  { id: 'te23', job_id: undefined, client_id: undefined, category: 'admin', start_time: '2026-04-03T15:30:00Z', end_time: '2026-04-03T16:15:00Z', duration_minutes: 45, billable: false, rate: 0, notes: 'Weekly review, schedule next week', created_at: '2026-04-03T16:15:00Z' },
]

export const MOCK_TASKS: Task[] = [
  { id: 'task1', job_id: 'j2', client_id: 'c2', title: 'Order additional stain (need 1 more gallon)', priority: 'high', due_date: '2026-04-05', completed: false },
  { id: 'task2', job_id: 'j3', client_id: 'c3', title: 'Exterior walkthrough and debris cleanup', priority: 'high', due_date: '2026-04-07', completed: false },
  { id: 'task3', job_id: 'j3', client_id: 'c3', title: 'Test backup generator', priority: 'high', due_date: '2026-04-06', completed: false },
  { id: 'task4', job_id: 'j7', client_id: 'c3', title: 'Order 4 yards of mulch — Kalispell Landscape Supply', priority: 'medium', due_date: '2026-04-08', completed: false },
  { id: 'task5', job_id: 'j6', client_id: 'c1', title: 'Set irrigation timer schedules for spring', priority: 'medium', due_date: '2026-04-09', completed: false },
  { id: 'task6', job_id: undefined, client_id: 'c4', title: 'Schedule bi-weekly lawn visits — May thru Sep', priority: 'low', due_date: '2026-04-10', completed: false },
  { id: 'task7', job_id: undefined, client_id: undefined, title: 'Renew liability insurance — expires May 1', priority: 'high', due_date: '2026-04-15', completed: false },
  { id: 'task8', job_id: 'j1', client_id: 'c1', title: 'Submit invoice for spring lawn startup', priority: 'medium', due_date: '2026-04-07', completed: false },
]

export const MOCK_CALENDAR_BLOCKS: CalendarBlock[] = [
  { id: 'cb1', property_id: 'p2', start_date: '2026-04-05', end_date: '2026-04-08', type: 'sbr_booking', notes: 'Hendersons' },
  { id: 'cb2', property_id: 'p2', start_date: '2026-04-12', end_date: '2026-04-15', type: 'sbr_booking', notes: 'Williams family' },
  { id: 'cb3', property_id: 'p3', start_date: '2026-04-06', end_date: '2026-04-07', type: 'sbr_booking', notes: 'Martin' },
  { id: 'cb4', property_id: 'p5', start_date: '2026-04-10', end_date: '2026-04-14', type: 'sbr_booking', notes: 'Anderson cousins' },
  { id: 'cb5', property_id: 'p4', start_date: '2026-04-07', end_date: '2026-04-07', type: 'job_day', notes: 'Mountain View opening cont.' },
  { id: 'cb6', property_id: 'p2', start_date: '2026-04-04', end_date: '2026-04-04', type: 'job_day', notes: 'Deck stain final coat' },
  { id: 'cb7', property_id: 'p1', start_date: '2026-04-09', end_date: '2026-04-09', type: 'job_day', notes: 'Miller irrigation timers' },
]

export const MOCK_SQUARE_INVOICES: SquareInvoice[] = [
  { id: 'si1', square_id: 'sq_inv_001', client_id: 'c4', job_id: 'j4', status: 'paid', amount_due: 320, amount_paid: 320, due_date: '2026-03-30', created_at: '2026-03-22T00:00:00Z', synced_at: '2026-03-30T12:00:00Z' },
  { id: 'si2', square_id: 'sq_inv_002', client_id: 'c4', job_id: 'j8', status: 'paid', amount_due: 240, amount_paid: 240, due_date: '2026-03-20', created_at: '2026-03-12T00:00:00Z', synced_at: '2026-03-20T09:00:00Z' },
  { id: 'si3', square_id: 'sq_inv_003', client_id: 'c2', job_id: 'j5', status: 'sent', amount_due: 337.50, amount_paid: 0, due_date: '2026-04-10', created_at: '2026-03-30T00:00:00Z', synced_at: '2026-03-30T16:00:00Z' },
  { id: 'si4', square_id: 'sq_inv_004', client_id: 'c1', job_id: 'j1', status: 'sent', amount_due: 637.50, amount_paid: 0, due_date: '2026-04-14', created_at: '2026-04-03T00:00:00Z', synced_at: '2026-04-03T17:00:00Z' },
  { id: 'si5', square_id: 'sq_inv_005', client_id: 'c3', job_id: 'j3', status: 'sent', amount_due: 998.75, amount_paid: 0, due_date: '2026-04-20', created_at: '2026-04-01T00:00:00Z', synced_at: '2026-04-01T18:00:00Z' },
]

// ─── Computed helpers ────────────────────────────────────────────

export function getActiveJobs() {
  return MOCK_JOBS.filter(j => j.status === 'active').map(job => {
    const client = MOCK_CLIENTS.find(c => c.id === job.client_id)
    const property = MOCK_PROPERTIES.find(p => p.id === job.property_id)
    const entries = MOCK_TIME_ENTRIES.filter(te => te.job_id === job.id)
    const billableHours = entries.filter(te => te.billable).reduce((sum, te) => sum + (te.duration_minutes || 0), 0) / 60
    const billedAmount = entries.filter(te => te.billable).reduce((sum, te) => sum + ((te.duration_minutes || 0) * (te.rate || 0) / 60), 0)
    return { ...job, client, property, billableHours, billedAmount }
  })
}

export function getWeeklyStats() {
  const weekStart = new Date('2026-03-30T00:00:00Z')
  const weekEnd = new Date('2026-04-05T23:59:59Z')
  const weekEntries = MOCK_TIME_ENTRIES.filter(te => {
    const d = new Date(te.start_time)
    return d >= weekStart && d <= weekEnd
  })
  const hoursThisWeek = weekEntries.reduce((sum, te) => sum + (te.duration_minutes || 0), 0) / 60
  const mtdEntries = MOCK_TIME_ENTRIES.filter(te => {
    const d = new Date(te.start_time)
    return d.getFullYear() === 2026 && d.getMonth() === 3 && te.billable
  })
  const billableMTD = mtdEntries.reduce((sum, te) => sum + ((te.duration_minutes || 0) * (te.rate || 0) / 60), 0)
  const squareUnpaid = MOCK_SQUARE_INVOICES.filter(inv => inv.status === 'sent' || inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount_due, 0)
  return {
    activeJobs: MOCK_JOBS.filter(j => j.status === 'active').length,
    hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
    billableMTD,
    squareUnpaid,
  }
}

export function getWeeklyChartData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dates = ['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05']
  return dates.map((date, i) => {
    const dayEntries = MOCK_TIME_ENTRIES.filter(te => te.start_time.startsWith(date))
    const byCategory = { client_work: 0, drive_time: 0, errand: 0, prep: 0, admin: 0 } as Record<string, number>
    dayEntries.forEach(te => { byCategory[te.category] = (byCategory[te.category] || 0) + (te.duration_minutes || 0) / 60 })
    return { day: days[i], date, ...byCategory }
  })
}

export function getDailyTimelineData(date: string = '2026-04-03') {
  return MOCK_TIME_ENTRIES
    .filter(te => te.start_time.startsWith(date))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .map(te => {
      const job = MOCK_JOBS.find(j => j.id === te.job_id)
      const client = MOCK_CLIENTS.find(c => c.id === te.client_id)
      return { ...te, job, client }
    })
}

export function getJobProfitability() {
  return MOCK_JOBS.filter(j => j.status !== 'cancelled').map(job => {
    const client = MOCK_CLIENTS.find(c => c.id === job.client_id)
    const entries = MOCK_TIME_ENTRIES.filter(te => te.job_id === job.id)
    const billableMinutes = entries.filter(te => te.billable).reduce((sum, te) => sum + (te.duration_minutes || 0), 0)
    const totalMinutes = entries.reduce((sum, te) => sum + (te.duration_minutes || 0), 0)
    const billedAmount = entries.filter(te => te.billable).reduce((sum, te) => sum + ((te.duration_minutes || 0) * (te.rate || 0) / 60), 0)
    const billableHours = billableMinutes / 60
    const effectiveRate = billableHours > 0 ? billedAmount / billableHours : 0
    const targetRate = job.target_rate || client?.default_hourly_rate || 80
    return {
      id: job.id, title: job.title, status: job.status,
      client_name: client?.name || 'Unknown',
      target_rate: targetRate,
      billable_hours: Math.round(billableHours * 10) / 10,
      total_hours: Math.round(totalMinutes / 60 * 10) / 10,
      billed_amount: Math.round(billedAmount * 100) / 100,
      effective_rate: Math.round(effectiveRate * 100) / 100,
      low_rate_flag: billableHours > 0 && effectiveRate < targetRate * 0.8,
    }
  })
}

export function getClientProfitability() {
  return MOCK_CLIENTS.map(client => {
    const entries = MOCK_TIME_ENTRIES.filter(te => te.client_id === client.id)
    const billableMinutes = entries.filter(te => te.billable).reduce((sum, te) => sum + (te.duration_minutes || 0), 0)
    const totalMinutes = entries.reduce((sum, te) => sum + (te.duration_minutes || 0), 0)
    const billed = entries.filter(te => te.billable).reduce((sum, te) => sum + ((te.duration_minutes || 0) * (te.rate || 0) / 60), 0)
    return {
      id: client.id, name: client.name,
      hours: Math.round(totalMinutes / 60 * 10) / 10,
      billed: Math.round(billed * 100) / 100,
      effective_rate: billableMinutes > 0 ? Math.round(billed / (billableMinutes / 60) * 100) / 100 : 0,
    }
  }).filter(c => c.hours > 0)
}
