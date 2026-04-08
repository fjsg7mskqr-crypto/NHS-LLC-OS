'use client'

import { Suspense, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SectionNav, { SECTIONS, type SectionId } from '@/components/layout/SectionNav'
import TodaySection from '@/components/sections/TodaySection'
import WorkSection from '@/components/sections/WorkSection'
import MoneySection from '@/components/sections/MoneySection'
import MoreSection from '@/components/sections/MoreSection'

const VALID_SECTIONS = new Set<string>(SECTIONS.map(s => s.id))

const SECTION_META: Record<SectionId, { title: string; brief: string }> = {
  today: { title: 'TODAY',     brief: 'Overview of current activity' },
  work:  { title: 'WORK',      brief: 'Jobs, time, and clients' },
  money: { title: 'MONEY',     brief: 'Revenue, invoices, and expenses' },
  more:  { title: 'MORE',      brief: 'Settings, integrations, and staff' },
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initial = searchParams.get('section')
  const [activeSection, setActiveSection] = useState<SectionId>(
    VALID_SECTIONS.has(initial ?? '') ? (initial as SectionId) : 'today'
  )

  const handleSectionChange = useCallback(
    (id: SectionId) => {
      setActiveSection(id)
      router.replace(`/dashboard?section=${id}`, { scroll: false })
    },
    [router]
  )

  const meta = SECTION_META[activeSection]

  return (
    <div className="flex">
      <SectionNav activeSection={activeSection} onSectionChange={handleSectionChange} />

      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-8">
        {/* Section header strip */}
        <div className="mb-5 flex items-center gap-3 border-b border-slate-700/60 pb-3 font-mono">
          <span className="w-2 h-2 bg-[oklch(0.78_0.17_75)] tactical-pulse" />
          <div className="leading-none">
            <div className="text-[12px] tracking-[0.25em] text-[oklch(0.78_0.17_75)]">{meta.title}</div>
            <div className="text-[10px] tracking-[0.1em] text-slate-500 mt-1 normal-case">{meta.brief}</div>
          </div>
        </div>

        <div className="boot-sequence" key={activeSection}>
          {activeSection === 'today' && <TodaySection />}
          {activeSection === 'work' && <WorkSection />}
          {activeSection === 'money' && <MoneySection />}
          {activeSection === 'more' && <MoreSection />}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <DashboardContent />
    </Suspense>
  )
}
