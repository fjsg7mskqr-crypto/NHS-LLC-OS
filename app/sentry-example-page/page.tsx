"use client";

export default function SentryExamplePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <button
        type="button"
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        onClick={() => {
          throw new Error("Sentry Test Error");
        }}
      >
        Trigger Sentry Error
      </button>
    </main>
  );
}
