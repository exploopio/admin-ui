'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Server,
  Activity,
  Clock,
  Cpu,
  HardDrive,
  MemoryStick,
  Pause,
  Play,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { apiClient } from '@/lib/api-client'
import type { Agent, AgentStatus } from '@/types/api'
import { toast } from 'sonner'

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string

  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const fetchAgent = async () => {
    try {
      const data = await apiClient.getAgent(agentId)
      setAgent(data)
    } catch (error) {
      console.error('Failed to fetch agent:', error)
      toast.error('Failed to fetch agent details')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAgent()
  }, [agentId])

  const handleDrain = async () => {
    if (!agent) return
    try {
      await apiClient.drainAgent(agent.id)
      toast.success(`Agent ${agent.name} is now draining`)
      fetchAgent()
    } catch (error) {
      console.error('Failed to drain agent:', error)
      toast.error('Failed to drain agent')
    }
  }

  const handleUncordon = async () => {
    if (!agent) return
    try {
      await apiClient.uncordonAgent(agent.id)
      toast.success(`Agent ${agent.name} is now online`)
      fetchAgent()
    } catch (error) {
      console.error('Failed to uncordon agent:', error)
      toast.error('Failed to uncordon agent')
    }
  }

  const handleDelete = async () => {
    if (!agent) return
    try {
      await apiClient.deleteAgent(agent.id)
      toast.success(`Agent ${agent.name} deleted`)
      router.push('/agents')
    } catch (error) {
      console.error('Failed to delete agent:', error)
      toast.error('Failed to delete agent')
    }
  }

  const getStatusBadge = (status: AgentStatus) => {
    const variants: Record<AgentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      online: 'default',
      offline: 'secondary',
      draining: 'outline',
      unhealthy: 'destructive',
    }
    return (
      <Badge variant={variants[status]} className="capitalize text-base px-3 py-1">
        {status}
      </Badge>
    )
  }

  if (isLoading) {
    return <AgentDetailSkeleton />
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Server className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Agent Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The agent you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        <Button asChild>
          <Link href="/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/agents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
              {getStatusBadge(agent.status)}
            </div>
            <p className="text-muted-foreground">
              Version {agent.version} | Region: {agent.region || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAgent}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {agent.status === 'online' ? (
            <Button variant="outline" size="sm" onClick={handleDrain}>
              <Pause className="mr-2 h-4 w-4" />
              Drain
            </Button>
          ) : agent.status === 'draining' ? (
            <Button variant="outline" size="sm" onClick={handleUncordon}>
              <Play className="mr-2 h-4 w-4" />
              Uncordon
            </Button>
          ) : null}
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agent.current_jobs}/{agent.max_concurrent_jobs}
            </div>
            <p className="text-xs text-muted-foreground">Max concurrent jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Completed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agent.total_jobs_completed}</div>
            <p className="text-xs text-muted-foreground">{agent.total_jobs_failed} failed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Heartbeat</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agent.last_heartbeat_at
                ? formatDistanceToNow(new Date(agent.last_heartbeat_at), {
                    addSuffix: true,
                  })
                : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              Lease expires{' '}
              {agent.lease_expires_at
                ? formatDistanceToNow(new Date(agent.lease_expires_at), {
                    addSuffix: true,
                  })
                : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agent.registered_at
                ? formatDistanceToNow(new Date(agent.registered_at), {
                    addSuffix: true,
                  })
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {agent.registered_at ? format(new Date(agent.registered_at), 'PPP') : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">CPU Usage</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${agent.cpu_usage}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">{agent.cpu_usage}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${agent.memory_usage}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">{agent.memory_usage}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Disk Usage</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${agent.disk_usage}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">{agent.disk_usage}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capabilities & Tools */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities?.length > 0 ? (
                agent.capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary">
                    {cap}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No capabilities defined</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {agent.tools?.length > 0 ? (
                agent.tools.map((tool) => (
                  <Badge key={tool} variant="outline">
                    {tool}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tools installed</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Agent ID</dt>
              <dd className="font-mono">{agent.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{agent.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Version</dt>
              <dd>{agent.version}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Region</dt>
              <dd>{agent.region || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created At</dt>
              <dd>{agent.created_at ? format(new Date(agent.created_at), 'PPpp') : 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated At</dt>
              <dd>{agent.updated_at ? format(new Date(agent.updated_at), 'PPpp') : 'N/A'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete agent{' '}
              <span className="font-medium">{agent.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AgentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
