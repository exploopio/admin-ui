'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ListTodo,
  RefreshCw,
  MoreHorizontal,
  XCircle,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiClient } from '@/lib/api-client'
import type { Job, JobStatus } from '@/types/api'
import { toast } from 'sonner'

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchJobs = useCallback(async () => {
    try {
      const params: { status?: string; page: number; per_page: number } = {
        page,
        per_page: perPage,
      }
      if (statusFilter !== 'all') params.status = statusFilter

      const response = await apiClient.listJobs(params)
      setJobs(response.data)
      setTotal(response.total)
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
      toast.error('Failed to fetch jobs')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [page, perPage, statusFilter])

  useEffect(() => {
    fetchJobs()
    // Auto-refresh every 10 seconds for jobs
    const interval = setInterval(fetchJobs, 10000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchJobs()
  }

  const handleCancel = async (job: Job) => {
    try {
      await apiClient.cancelJob(job.id)
      toast.success('Job cancelled')
      fetchJobs()
    } catch (error) {
      console.error('Failed to cancel job:', error)
      toast.error('Failed to cancel job')
    }
  }

  const handleRetry = async (job: Job) => {
    try {
      await apiClient.retryJob(job.id)
      toast.success('Job queued for retry')
      fetchJobs()
    } catch (error) {
      console.error('Failed to retry job:', error)
      toast.error('Failed to retry job')
    }
  }

  const getStatusBadge = (status: JobStatus) => {
    const config: Record<
      JobStatus,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
    > = {
      pending: { variant: 'outline' },
      queued: { variant: 'outline', className: 'border-yellow-500 text-yellow-600' },
      assigned: { variant: 'secondary' },
      running: { variant: 'default', className: 'bg-blue-500' },
      completed: { variant: 'default', className: 'bg-green-500' },
      failed: { variant: 'destructive' },
      cancelled: { variant: 'secondary' },
      timeout: { variant: 'destructive', className: 'bg-orange-500' },
    }
    const { variant, className } = config[status]
    return (
      <Badge variant={variant} className={`capitalize ${className || ''}`}>
        {status}
      </Badge>
    )
  }

  const totalPages = Math.ceil(total / perPage)

  if (isLoading) {
    return <JobsPageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">Monitor and manage platform jobs</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="timeout">Timeout</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto text-sm text-muted-foreground">
          {total} job{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scanner</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <ListTodo className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No jobs found</p>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
                      {job.scanner_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm truncate max-w-[200px] block">{job.target}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>
                    {job.status === 'running' ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-xs">{job.progress}%</span>
                      </div>
                    ) : job.status === 'queued' && job.queue_position ? (
                      <span className="text-xs text-muted-foreground">
                        #{job.queue_position} in queue
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {job.agent_name ? (
                      <span className="text-sm">{job.agent_name}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm truncate max-w-[120px] block">
                      {job.tenant_name || job.tenant_id.slice(0, 8)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(job.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/jobs/${job.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {(job.status === 'pending' ||
                          job.status === 'queued' ||
                          job.status === 'running') && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleCancel(job)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          </>
                        )}
                        {(job.status === 'failed' || job.status === 'timeout') && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleRetry(job)}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Retry
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function JobsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-24" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
