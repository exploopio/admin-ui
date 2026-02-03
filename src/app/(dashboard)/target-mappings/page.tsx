'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ArrowLeftRight,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Star,
  Filter,
  Download,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { apiClient } from '@/lib/api-client'
import type { TargetAssetTypeMapping } from '@/types/api'
import { TARGET_TYPES, ASSET_TYPES } from '@/types/api'
import { toast } from 'sonner'

export default function TargetMappingsPage() {
  const [mappings, setMappings] = useState<TargetAssetTypeMapping[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(30)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters
  const [filterTargetType, setFilterTargetType] = useState<string>('')
  const [filterAssetType, setFilterAssetType] = useState<string>('')
  const [filterIsActive, setFilterIsActive] = useState<string>('')

  // Create mapping dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    target_type: '',
    asset_type: '',
    is_primary: false,
    is_active: true,
    description: '',
  })

  // Edit mapping dialog
  const [editDialog, setEditDialog] = useState<{
    open: boolean
    mapping: TargetAssetTypeMapping | null
  }>({ open: false, mapping: null })
  const [editForm, setEditForm] = useState({
    is_primary: false,
    is_active: true,
    description: '',
  })
  const [isEditing, setIsEditing] = useState(false)

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    mapping: TargetAssetTypeMapping | null
  }>({ open: false, mapping: null })

  const fetchMappings = useCallback(async () => {
    try {
      const response = await apiClient.listTargetMappings({
        target_type: filterTargetType || undefined,
        asset_type: filterAssetType || undefined,
        is_active: filterIsActive ? filterIsActive === 'true' : undefined,
        page,
        per_page: perPage,
      })
      setMappings(response.data)
      setTotal(response.total)
    } catch (error) {
      console.error('Failed to fetch target mappings:', error)
      toast.error('Failed to fetch target mappings')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [page, perPage, filterTargetType, filterAssetType, filterIsActive])

  useEffect(() => {
    fetchMappings()
  }, [fetchMappings])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchMappings()
  }

  const handleCreate = async () => {
    if (!createForm.target_type || !createForm.asset_type) {
      toast.error('Target type and asset type are required')
      return
    }

    setIsCreating(true)
    try {
      await apiClient.createTargetMapping({
        target_type: createForm.target_type,
        asset_type: createForm.asset_type,
        is_primary: createForm.is_primary,
        is_active: createForm.is_active,
        description: createForm.description || undefined,
      })
      toast.success('Target mapping created')
      setCreateDialogOpen(false)
      setCreateForm({
        target_type: '',
        asset_type: '',
        is_primary: false,
        is_active: true,
        description: '',
      })
      fetchMappings()
    } catch (error) {
      console.error('Failed to create target mapping:', error)
      toast.error('Failed to create target mapping')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!editDialog.mapping) return

    setIsEditing(true)
    try {
      await apiClient.updateTargetMapping(editDialog.mapping.id, {
        is_primary: editForm.is_primary,
        is_active: editForm.is_active,
        description: editForm.description || undefined,
      })
      toast.success('Target mapping updated')
      setEditDialog({ open: false, mapping: null })
      fetchMappings()
    } catch (error) {
      console.error('Failed to update target mapping:', error)
      toast.error('Failed to update target mapping')
    } finally {
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.mapping) return
    try {
      await apiClient.deleteTargetMapping(deleteDialog.mapping.id)
      toast.success('Target mapping deleted')
      setDeleteDialog({ open: false, mapping: null })
      fetchMappings()
    } catch (error) {
      console.error('Failed to delete target mapping:', error)
      toast.error('Failed to delete target mapping')
    }
  }

  const openEditDialog = (mapping: TargetAssetTypeMapping) => {
    setEditForm({
      is_primary: mapping.is_primary,
      is_active: mapping.is_active,
      description: mapping.description || '',
    })
    setEditDialog({ open: true, mapping })
  }

  const handleExport = () => {
    const exportData = mappings.map((m) => ({
      target_type: m.target_type,
      asset_type: m.asset_type,
      is_primary: m.is_primary,
      description: m.description,
    }))
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'target-mappings.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported mappings to JSON')
  }

  const clearFilters = () => {
    setFilterTargetType('')
    setFilterAssetType('')
    setFilterIsActive('')
    setPage(1)
  }

  const totalPages = Math.ceil(total / perPage)
  const hasFilters = filterTargetType || filterAssetType || filterIsActive

  if (isLoading) {
    return <TargetMappingsPageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Target Mappings</h1>
          <p className="text-muted-foreground">
            Configure scanner target to asset type mappings for smart filtering
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Mapping
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Target Mapping</DialogTitle>
                <DialogDescription>
                  Create a new mapping between a scanner target type and an asset type
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="target_type">Target Type</Label>
                  <Select
                    value={createForm.target_type}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, target_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The target type from scanner&apos;s supported_targets
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset_type">Asset Type</Label>
                  <Select
                    value={createForm.asset_type}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, asset_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">The asset type to map to</p>
                </div>
                <div className="space-y-2">
                  <Label>Primary Mapping</Label>
                  <Select
                    value={createForm.is_primary ? 'yes' : 'no'}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, is_primary: v === 'yes' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes (used for reverse lookups)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={createForm.is_active ? 'active' : 'inactive'}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, is_active: v === 'active' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive (disabled for scans)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Map URL targets to website assets"
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Mapping'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ArrowLeftRight className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">About Target Mappings</p>
              <p className="text-muted-foreground">
                Target mappings define how scanner target types (like &quot;url&quot;,
                &quot;domain&quot;, &quot;ip&quot;) map to asset types (like &quot;website&quot;,
                &quot;domain&quot;, &quot;ip_address&quot;). This enables smart filtering - when a
                scan runs, only compatible assets are included based on these mappings. Primary
                mappings are used for reverse lookups.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by:</span>
        </div>
        <Select value={filterTargetType} onValueChange={setFilterTargetType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Target type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All target types</SelectItem>
            {TARGET_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAssetType} onValueChange={setFilterAssetType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Asset type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All asset types</SelectItem>
            {ASSET_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterIsActive} onValueChange={setFilterIsActive}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All status</SelectItem>
            <SelectItem value="true">Active only</SelectItem>
            <SelectItem value="false">Inactive only</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          {total} mapping{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target Type</TableHead>
              <TableHead>Asset Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <ArrowLeftRight className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No target mappings found</p>
                  {hasFilters && (
                    <Button variant="link" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {mapping.target_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {mapping.asset_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={mapping.is_active ? 'default' : 'secondary'}>
                      {mapping.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {mapping.is_primary ? (
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3" />
                        Primary
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="truncate max-w-[250px] block text-sm text-muted-foreground">
                      {mapping.description || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(mapping.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(mapping)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDialog({ open: true, mapping })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

      {/* Edit Dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, mapping: editDialog.mapping })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Target Mapping</DialogTitle>
            <DialogDescription>
              Update the mapping between{' '}
              <code className="bg-muted px-1 rounded">{editDialog.mapping?.target_type}</code> and{' '}
              <code className="bg-muted px-1 rounded">{editDialog.mapping?.asset_type}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Mapping</Label>
              <Select
                value={editForm.is_primary ? 'yes' : 'no'}
                onValueChange={(v) => setEditForm((f) => ({ ...f, is_primary: v === 'yes' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes (used for reverse lookups)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.is_active ? 'active' : 'inactive'}
                onValueChange={(v) => setEditForm((f) => ({ ...f, is_active: v === 'active' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive (disabled for scans)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description (optional)</Label>
              <Input
                id="edit_description"
                placeholder="e.g., Map URL targets to website assets"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, mapping: null })}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isEditing}>
              {isEditing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, mapping: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Target Mapping</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the mapping between{' '}
              <code className="bg-muted px-1 rounded">{deleteDialog.mapping?.target_type}</code> and{' '}
              <code className="bg-muted px-1 rounded">{deleteDialog.mapping?.asset_type}</code>?
              This may affect smart filtering for scans using this target type.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, mapping: null })}>
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

function TargetMappingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
