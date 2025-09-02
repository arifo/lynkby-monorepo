export default function Loading() {
  return (
    <main className="min-h-screen bg-white">
      <section className="max-w-xl mx-auto px-4 py-10 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200" />
          <div className="space-y-2 w-full">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
        </div>
      </section>
    </main>
  );
}

