import Link from 'next/link'

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string
    next?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const error = params?.error
  const nextPath =
    params?.next && params.next.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : '/dashboard'

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8 shadow-2xl shadow-black/30">
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-lg font-black text-black">
              N
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Google auth now gates the live dashboard and API routes.
            </p>
          </div>

          {error ? (
            <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <a
            href={`/auth/login?next=${encodeURIComponent(nextPath)}`}
            className="flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
          >
            Continue with Google
          </a>

          <p className="mt-6 text-xs leading-5 text-slate-500">
            If Google login fails, verify the redirect URL in Supabase and Google Cloud:
            <span className="font-mono text-slate-400"> /auth/callback</span>.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Need access? Contact the account owner who manages Supabase auth.
          <Link href="/" className="ml-1 text-slate-300 underline underline-offset-4">
            Home
          </Link>
        </p>
      </div>
    </main>
  )
}
