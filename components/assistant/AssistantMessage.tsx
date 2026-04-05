'use client'

type AssistantMessageProps = {
  role: 'user' | 'assistant'
  content: string
  actionName?: string
}

export default function AssistantMessage({ role, content, actionName }: AssistantMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl border px-4 py-3 shadow-sm ${
          isUser
            ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-50'
            : 'border-slate-700 bg-slate-900/90 text-slate-100'
        }`}
      >
        {!isUser && actionName ? (
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
            {actionName.replaceAll('_', ' ')}
          </div>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-6">{content}</p>
      </div>
    </div>
  )
}
