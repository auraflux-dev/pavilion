/** Lightweight UI placeholder cards for Product page. */

export function ProductPreviewCards() {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-10 pt-2 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Parent dashboard preview
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="h-3 w-32 rounded bg-zinc-200" />
            <div className="h-6 w-16 rounded-full bg-emerald-50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 rounded-xl bg-zinc-100" />
            <div className="h-20 rounded-xl bg-zinc-100" />
          </div>
          <div className="h-10 rounded-xl bg-zinc-100" />
          <div className="h-10 rounded-xl bg-zinc-100" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Mobile checkout preview
        </div>
        <div className="flex justify-center bg-zinc-50 px-5 py-6">
          <div className="w-full max-w-[220px] rounded-[1.5rem] border border-zinc-300 bg-white p-3 shadow-md">
            <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-zinc-200" />
            <div className="space-y-2">
              <div className="h-24 rounded-xl bg-zinc-100" />
              <div className="h-3 w-3/4 rounded bg-zinc-200" />
              <div className="h-3 w-1/2 rounded bg-zinc-200" />
              <div className="mt-3 h-9 rounded-lg bg-emerald-900" />
              <p className="pt-1 text-center text-[10px] font-medium text-slate-500">
                School Square checkout
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
