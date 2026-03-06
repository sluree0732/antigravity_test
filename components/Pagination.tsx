'use client'

interface Props {
  page: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, total, limit, onPageChange }: Props) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="flex justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 text-sm border border-violet-200 text-slate-500 rounded-lg disabled:opacity-40 hover:bg-violet-50 transition-colors"
      >
        이전
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
            p === page
              ? 'bg-violet-500 text-white border-violet-500 shadow-sm'
              : 'border-violet-200 text-slate-500 hover:bg-violet-50'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 text-sm border border-violet-200 text-slate-500 rounded-lg disabled:opacity-40 hover:bg-violet-50 transition-colors"
      >
        다음
      </button>
    </div>
  )
}
