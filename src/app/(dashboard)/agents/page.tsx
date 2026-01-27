'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Server,
  RefreshCw,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiClient } from '@/lib/api-client'
import type { Agent } from '@/types/api'
import { toast } from 'sonner'

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    agent: Agent | null
  }>({ open: false, agent: null })

  const fetchAgents = useCallback(async () => {
    try {
      const params: { status?: string; region?: string; page: number; per_page: number } = {
        page,
        per_page: perPage,
      }
      if (statusFilter !== 'all') params.status = statusFilter
      if (regionFilter !== 'all') params.region = regionFilter

      const response = await apiClient.listAgents(params)
      setAgents(response.data)
      setTotal(response.total)
    } catch (error) {
      console.error('Failed to fetch agents:', error)
      toast.error('Failed to fetch agents')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [page, perPage, statusFilter, regionFilter])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchAgents()
  }

  const handleDrain = async (agent: Agent) => {
    try {
      await apiClient.drainAgent(agent.id)
      toast.success(`Agent ${agent.name} is now draining`)
      fetchAgents()
    } catch (error) {
      console.error('Failed to drain agent:', error)
      toast.error('Failed to drain agent')
    }
  }

  const handleUncordon = async (agent: Agent) => {
    try {
      await apiClient.uncordonAgent(agent.id)
      toast.success(`Agent ${agent.name} is now online`)
      fetchAgents()
    } catch (error) {
      console.error('Failed to uncordon agent:', error)
      toast.error('Failed to uncordon agent')
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.agent) return

    try {
      await apiClient.deleteAgent(deleteDialog.agent.id)
      toast.success(`Agent ${deleteDialog.agent.name} deleted`)
      setDeleteDialog({ open: false, agent: null })
      fetchAgents()
    } catch (error) {
      console.error('Failed to delete agent:', error)
      toast.error('Failed to delete agent')
    }
  }

  const getStatusBadge = (agent: Agent) => {
    if (agent.status === 'disabled') {
      return <Badge variant="outline">Draining</Badge>
    }
    if (agent.health === 'offline') {
      return <Badge variant="secondary">Offline</Badge>
    }
    if (agent.health === 'online') {
      return <Badge variant="default">Online</Badge>
    }
    return <Badge variant="destructive">Unknown</Badge>
  }

  const totalPages = Math.ceil(total / perPage)

  // Get unique regions from agents for filter
  const regions = [...new Set(agents.map((a) => a.region))].filter(Boolean)

  if (isLoading) {
    return <AgentsPageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">Manage platform agents and their status</p>
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
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="draining">Draining</SelectItem>
              <SelectItem value="unhealthy">Unhealthy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {regions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Region:</span>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region as string} value={region as string}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="ml-auto text-sm text-muted-foreground">
          {total} agent{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Resources</TableHead>
              <TableHead>Last Heartbeat</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Server className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No agents found</p>
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div>
                      <Link href={`/agents/${agent.id}`} className="font-medium hover:underline">
                        {agent.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">v{agent.version}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(agent)}</TableCell>
                  <TableCell>{agent.region || '-'}</TableCell>
                  <TableCell>
                    <span className="font-medium">{agent.current_jobs}</span>
                    <span className="text-muted-foreground">/{agent.max_concurrent_jobs}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-0.5">
                      <div>CPU: {agent.cpu_percent}%</div>
                      <div>Mem: {agent.memory_percent}%</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {agent.last_heartbeat_at
                      ? formatDistanceToNow(new Date(agent.last_heartbeat_at), {
                        addSuffix: true,
                      })
                      : '-'}
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
                          <Link href={`/agents/${agent.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {agent.status === 'active' ? (
                          <DropdownMenuItem onClick={() => handleDrain(agent)}>
                            <Pause className="mr-2 h-4 w-4" />
                            Drain
                          </DropdownMenuItem>
                        ) : agent.status === 'disabled' ? (
                          <DropdownMenuItem onClick={() => handleUncordon(agent)}>
                            <Play className="mr-2 h-4 w-4" />
                            Uncordon
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteDialog({ open: true, agent })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, agent: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete agent{' '}
              <span className="font-medium">{deleteDialog.agent?.name}</span>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, agent: null })}>
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

function AgentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-40" />
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
