import { redirect } from 'next/navigation'
import AssistantLauncher from '@/components/assistant/AssistantLauncher'
import Header from '@/components/layout/Header'
import TelemetryTicker from '@/components/ui/TelemetryTicker'
import CommandPalette from '@/components/ui/CommandPalette'
import { getAuthenticatedUserFromCookies } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUserFromCookies()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header userEmail={user.email ?? null} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <TelemetryTicker />
      <AssistantLauncher />
      <CommandPalette />
    </div>
  )
}
