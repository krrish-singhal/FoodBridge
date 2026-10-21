'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DataTablePaginationProps {
  pageCount: number
  totalItems: number
  currentPage: number
  pageSize: number
}

export function DataTablePagination({
  pageCount,
  totalItems,
  currentPage,
  pageSize,
}: DataTablePaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  const hasNext = currentPage < pageCount
  const hasPrev = currentPage > 1

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex-1 text-sm text-gray-500">
        Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
        {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
      </div>
      <div className="flex items-center space-x-2">
        <Link
          href={hasPrev ? createPageURL(currentPage - 1) : '#'}
          className={`inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
            !hasPrev ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Link>
        
        <span className="text-sm text-gray-700">
          Page {currentPage} of {Math.max(1, pageCount)}
        </span>
        
        <Link
          href={hasNext ? createPageURL(currentPage + 1) : '#'}
          className={`inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
            !hasNext ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  )
}
