'use client'

import { Suspense, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SectionNav, { SECTIONS, type SectionId } from '@/components/layout/SectionNav'
import TodaySection from '@/components/sections/TodaySection'
import WorkSection from '@/components/sections/WorkSection'
import MoneySection from '@/components/sections/MoneySection'
import MoreSection from '@/components/sections/MoreSection'

const VALID_SECTIONS = new Set<string>(SECTIONS.map(s => s.id))

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

  return (
    <div className="flex flex-col min-h-full">
      <SectionNav activeSection={activeSection} onSectionChange={handleSectionChange} />

      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6 pb-24 lg:pb-6">
        <div className="tab-content" key={activeSection}>
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
