'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ScrollText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  User,
  Server,
  Settings,
  Eye,
} from 'lucide-react'
import { formatDistanceToNow, format, subDays } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api-client'
import type { AuditLog, AuditAction, AuditActorType } from '@/types/api'
import { toast } from 'sonner'

const actionCategories: Record<string, AuditAction[]> = {
  Agent: ['agent.register', 'agent.heartbeat', 'agent.drain', 'agent.uncordon', 'agent.delete'],
  Job: ['job.create', 'job.assign', 'job.complete', 'job.fail', 'job.cancel', 'job.timeout'],
  Token: ['token.create', 'token.use', 'token.revoke'],
  Admin: ['admin.create', 'admin.update', 'admin.delete', 'admin.login', 'admin.rotate_key'],
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(30)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [actorTypeFilter, setActorTypeFilter] = useState<string>('all')
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('7d')

  // Detail dialog
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const getDateRange = useCallback(() => {
    const now = new Date()
    switch (dateRange) {
      case '1d':
        return { from: subDays(now, 1).toISOString() }
      case '7d':
        return { from: subDays(now, 7).toISOString() }
      case '30d':
        return { from: subDays(now, 30).toISOString() }
      case '90d':
        return { from: subDays(now, 90).toISOString() }
      default:
        return {}
    }
  }, [dateRange])

  const fetchLogs = useCallback(async () => {
    try {
      const dateParams = getDateRange()
      const params: {
        action?: AuditAction
        actor_type?: AuditActorType
        resource_type?: string
        from?: string
        page: number
        per_page: number
      } = {
        page,
        per_page: perPage,
        ...dateParams,
      }

      if (actionFilter !== 'all') params.action = actionFilter as AuditAction
      if (actorTypeFilter !== 'all') params.actor_type = actorTypeFilter as AuditActorType
      if (resourceTypeFilter !== 'all') params.resource_type = resourceTypeFilter

      const response = await apiClient.listAuditLogs(params)
      setLogs(response.data)
      setTotal(response.total)
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
      toast.error('Failed to fetch audit logs')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [page, perPage, actionFilter, actorTypeFilter, resourceTypeFilter, getDateRange])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchLogs()
  }

  const clearFilters = () => {
    setActionFilter('all')
    setActorTypeFilter('all')
    setResourceTypeFilter('all')
    setDateRange('7d')
    setPage(1)
  }

  const hasActiveFilters =
    actionFilter !== 'all' ||
    actorTypeFilter !== 'all' ||
    resourceTypeFilter !== 'all' ||
    dateRange !== '7d'

  const getActionBadge = (action: AuditAction) => {
    const [category, type] = action.split('.')
    const colorMap: Record<string, string> = {
      agent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      job: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      token: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      admin: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return (
      <Badge variant="outline" className={`${colorMap[category] || ''} border-0`}>
        {action}
      </Badge>
    )
  }

  const getActorIcon = (actorType: AuditActorType) => {
    switch (actorType) {
      case 'admin':
        return <User className="h-4 w-4" />
      case 'agent':
        return <Server className="h-4 w-4" />
      case 'system':
        return <Settings className="h-4 w-4" />
    }
  }

  const totalPages = Math.ceil(total / perPage)

  if (isLoading) {
    return <AuditLogsPageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">Track all platform activities and changes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    Active
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Audit Logs</SheetTitle>
                <SheetDescription>
                  Narrow down the audit logs by action, actor, or date range.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">Last 24 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Action Category</Label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All actions</SelectItem>
                      {Object.entries(actionCategories).map(([category, actions]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {category}
                          </div>
                          {actions.map((action) => (
                            <SelectItem key={action} value={action}>
                              {action}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Actor Type</Label>
                  <Select value={actorTypeFilter} onValueChange={setActorTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All actors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All actors</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Resource Type</Label>
                  <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All resources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All resources</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="job">Job</SelectItem>
                      <SelectItem value="token">Token</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button variant="outline" className="w-full" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {dateRange !== '7d' && (
            <Badge variant="secondary">
              {dateRange === '1d'
                ? 'Last 24h'
                : dateRange === '30d'
                  ? 'Last 30d'
                  : dateRange === '90d'
                    ? 'Last 90d'
                    : 'All time'}
            </Badge>
          )}
          {actionFilter !== 'all' && <Badge variant="secondary">{actionFilter}</Badge>}
          {actorTypeFilter !== 'all' && <Badge variant="secondary">Actor: {actorTypeFilter}</Badge>}
          {resourceTypeFilter !== 'all' && (
            <Badge variant="secondary">Resource: {resourceTypeFilter}</Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Showing {logs.length} of {total} logs
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <ScrollText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No audit logs found</p>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm">
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActorIcon(log.actor_type)}
                      <div>
                        <p className="text-sm font-medium">
                          {log.actor_name || log.actor_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{log.actor_type}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{log.resource_name || log.resource_id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {log.resource_type}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-mono">{log.ip_address || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.created_at), 'PPpp')}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Action</CardTitle>
                  </CardHeader>
                  <CardContent>{getActionBadge(selectedLog.action)}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Actor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {getActorIcon(selectedLog.actor_type)}
                      <div>
                        <p className="font-medium">
                          {selectedLog.actor_name || selectedLog.actor_id}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {selectedLog.actor_type}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resource</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="capitalize">{selectedLog.resource_type}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">ID</dt>
                      <dd className="font-mono">{selectedLog.resource_id}</dd>
                    </div>
                    {selectedLog.resource_name && (
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Name</dt>
                        <dd>{selectedLog.resource_name}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Request Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">IP Address</dt>
                      <dd className="font-mono">{selectedLog.ip_address || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">User Agent</dt>
                      <dd className="truncate text-xs">{selectedLog.user_agent || 'N/A'}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              <div className="text-xs text-muted-foreground">
                Log ID: <span className="font-mono">{selectedLog.id}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AuditLogsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-36" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
