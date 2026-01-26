'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ListTodo,
  Clock,
  Server,
  XCircle,
  RotateCcw,
  RefreshCw,
  Target,
  AlertCircle,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api-client'
import type { Job, JobStatus } from '@/types/api'
import { toast } from 'sonner'

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchJob = async () => {
    try {
      const data = await apiClient.getJob(jobId)
      setJob(data)
    } catch (error) {
      console.error('Failed to fetch job:', error)
      toast.error('Failed to fetch job details')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchJob()
    // Auto-refresh running jobs
    const interval = setInterval(() => {
      if (job?.status === 'running' || job?.status === 'queued') {
        fetchJob()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [jobId, job?.status])

  const handleCancel = async () => {
    if (!job) return
    try {
      await apiClient.cancelJob(job.id)
      toast.success('Job cancelled')
      fetchJob()
    } catch (error) {
      console.error('Failed to cancel job:', error)
      toast.error('Failed to cancel job')
    }
  }

  const handleRetry = async () => {
    if (!job) return
    try {
      await apiClient.retryJob(job.id)
      toast.success('Job queued for retry')
      fetchJob()
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
      <Badge variant={variant} className={`capitalize text-base px-3 py-1 ${className || ''}`}>
        {status}
      </Badge>
    )
  }

  if (isLoading) {
    return <JobDetailSkeleton />
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The job you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild>
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
      </div>
    )
  }

  const canCancel = ['pending', 'queued', 'running'].includes(job.status)
  const canRetry = ['failed', 'timeout'].includes(job.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/jobs">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{job.scanner_name}</h1>
              {getStatusBadge(job.status)}
            </div>
            <p className="text-muted-foreground truncate max-w-lg">{job.target}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchJob}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {canCancel && (
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          {canRetry && (
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Progress (for running jobs) */}
      {job.status === 'running' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <span className="text-lg font-medium w-16 text-right">{job.progress}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Position (for queued jobs) */}
      {job.status === 'queued' && job.queue_position && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Queue Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">#{job.queue_position}</div>
            <p className="text-sm text-muted-foreground">Waiting for an available agent</p>
          </CardContent>
        </Card>
      )}

      {/* Error Message (for failed jobs) */}
      {job.error_message && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
              {job.error_message}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Type</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{job.type}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priority</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{job.priority}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timeout</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(job.timeout_seconds / 60)}m</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agent</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{job.agent_name || 'Not assigned'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Timing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Timing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{format(new Date(job.created_at), 'PPpp')}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(job.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
            {job.started_at && (
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-medium">{format(new Date(job.started_at), 'PPpp')}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(job.started_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            )}
            {job.completed_at && (
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-medium">{format(new Date(job.completed_at), 'PPpp')}</p>
                <p className="text-xs text-muted-foreground">
                  Duration:{' '}
                  {job.started_at &&
                    Math.round(
                      (new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) /
                        1000
                    )}
                  s
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Job ID</dt>
              <dd className="font-mono">{job.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tenant ID</dt>
              <dd className="font-mono">{job.tenant_id}</dd>
            </div>
            {job.tenant_name && (
              <div>
                <dt className="text-muted-foreground">Tenant Name</dt>
                <dd>{job.tenant_name}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Scanner</dt>
              <dd>{job.scanner_name}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Target</dt>
              <dd className="font-mono break-all">{job.target}</dd>
            </div>
            {job.agent_id && (
              <>
                <div>
                  <dt className="text-muted-foreground">Agent ID</dt>
                  <dd className="font-mono">{job.agent_id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Agent Name</dt>
                  <dd>
                    <Link href={`/agents/${job.agent_id}`} className="hover:underline text-primary">
                      {job.agent_name}
                    </Link>
                  </dd>
                </div>
              </>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

function JobDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
