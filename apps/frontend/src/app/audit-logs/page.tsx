"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { PERMISSION, hasPermission } from "@fundifyhub/types"
import { 
  useAuditLogs, 
  useAuditLogStats,
  type AuditLog 
} from "@/hooks/queries/useAuditLogs"
import { useDebounce } from "@/hooks/useDebounce"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Pagination } from "@/components/ui/pagination"
import { redirect } from "next/navigation"
import { 
  Search, Filter, RefreshCw, Activity, User, 
  FileText, Settings, Shield, Clock, Eye, Globe, 
  Monitor, Calendar, Hash, Database, Copy, Check
} from "lucide-react"
import toast from "@/lib/toast"

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "VIEW", label: "View" },
  { value: "APPROVE", label: "Approve" },
  { value: "REJECT", label: "Reject" },
]

const ENTITY_TYPES = [
  { value: "all", label: "All Entities" },
  { value: "USER", label: "User" },
  { value: "REQUEST", label: "Request" },
  { value: "LOAN", label: "Loan" },
  { value: "DOCUMENT", label: "Document" },
  { value: "PAYMENT", label: "Payment" },
  { value: "SERVICE", label: "Service" },
]

function AuditLogsSkeleton() {
  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-12 rounded-lg" />
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function getActionIcon(action: string) {
  switch (action.toUpperCase()) {
    case "LOGIN":
    case "LOGOUT":
      return <User className="h-4 w-4" />
    case "CREATE":
    case "UPDATE":
    case "DELETE":
      return <FileText className="h-4 w-4" />
    case "VIEW":
      return <Eye className="h-4 w-4" />
    case "CONFIGURE":
      return <Settings className="h-4 w-4" />
    default:
      return <Activity className="h-4 w-4" />
  }
}

function getActionBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  switch (action.toUpperCase()) {
    case "CREATE":
    case "APPROVE":
      return "default"
    case "DELETE":
    case "REJECT":
      return "destructive"
    case "UPDATE":
    case "CONFIGURE":
      return "secondary"
    default:
      return "outline"
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Extended AuditLog type for display purposes
interface DisplayAuditLog extends AuditLog {
  userEmail: string
  userName: string
}

function AuditLogsContent() {
  const { user, isLoading: authLoading } = useAuth()
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [entityFilter, setEntityFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  
  // View details modal
  const [selectedLog, setSelectedLog] = useState<DisplayAuditLog | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [actionFilter, entityFilter, debouncedSearch, pageSize])

  // React Query hooks
  const { 
    data: logsData, 
    isLoading,
    refetch: refetchLogs,
    isFetching 
  } = useAuditLogs(
    {
      page: currentPage,
      limit: pageSize,
      action: actionFilter !== "all" ? actionFilter : undefined,
      entityType: entityFilter !== "all" ? entityFilter : undefined,
      search: debouncedSearch || undefined,
    },
    { enabled: !!user }
  )

  const { data: stats, refetch: refetchStats } = useAuditLogStats({ enabled: !!user })

  // Transform logs for display (add computed fields)
  const logs: DisplayAuditLog[] = (logsData?.logs || []).map(log => ({
    ...log,
    userEmail: log.actorEmail || 'Unknown',
    userName: log.actorName || 'Unknown',
  }))
  const pagination = logsData?.pagination

  const handleRefresh = () => {
    refetchLogs()
    refetchStats()
  }

  // Open details modal
  const openDetailsModal = (log: DisplayAuditLog) => {
    setSelectedLog(log)
    setShowDetailsModal(true)
  }

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  if (authLoading) {
    return <AuditLogsSkeleton />
  }

  if (!user) {
    return null
  }

  const userRoles = user.roles || []
  const canViewAuditLogs = hasPermission(userRoles, PERMISSION.VIEW_AUDIT_LOGS)

  // Only super admins can view audit logs
  if (!canViewAuditLogs) {
    redirect("/dashboard")
  }

  // Stats display helpers
  const topAction = stats?.logsByAction 
    ? Object.entries(stats.logsByAction).sort((a, b) => b[1] - a[1])[0]?.[0]?.toLowerCase() 
    : "-"

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title="Audit Logs"
          description="System activity and security audit trail."
          actions={
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pagination?.total?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.recentActivity?.[0]?.count?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Entity Types</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.logsByEntityType ? Object.keys(stats.logsByEntityType).length : 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top Action</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {topAction}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, email, or entity..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">No audit logs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                System activity will appear here as users interact with the platform.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{formatDate(log.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.userName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)} className="gap-1">
                          {getActionIcon(log.action)}
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.entityType}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {log.entityId?.slice(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ipAddress || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDetailsModal(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 0 && (
              <div className="mt-6">
                <Pagination
                  page={currentPage}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize)
                    setCurrentPage(1)
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Audit Log Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Audit Log Details
              </DialogTitle>
              <DialogDescription>
                Complete information about this audit event.
              </DialogDescription>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-6 py-4">
                {/* Action Badge */}
                <div className="flex items-center gap-3">
                  <Badge variant={getActionBadgeVariant(selectedLog.action)} className="gap-1 text-sm px-3 py-1">
                    {getActionIcon(selectedLog.action)}
                    {selectedLog.action}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(selectedLog.createdAt)}
                  </span>
                </div>

                {/* User Information */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User Information
                  </h4>
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{selectedLog.userName || "Unknown"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedLog.userEmail}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(selectedLog.userEmail, "email")}
                        >
                          {copiedField === "email" ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">User ID</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {selectedLog.actorId}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(selectedLog.actorId, "userId")}
                        >
                          {copiedField === "userId" ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Entity Information */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Entity Information
                  </h4>
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Entity Type</span>
                      <Badge variant="outline">{selectedLog.entityType}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Entity ID</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {selectedLog.entityId}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(selectedLog.entityId, "entityId")}
                        >
                          {copiedField === "entityId" ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Request Information */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Request Details
                  </h4>
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">IP Address</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {selectedLog.ipAddress || "N/A"}
                        </code>
                        {selectedLog.ipAddress && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(selectedLog.ipAddress!, "ip")}
                          >
                            {copiedField === "ip" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        User Agent
                      </span>
                      <p className="text-xs bg-muted p-2 rounded font-mono break-all">
                        {selectedLog.userAgent || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Timestamp
                  </h4>
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Date & Time</span>
                      <span className="font-medium">
                        {new Date(selectedLog.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">UTC</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {selectedLog.createdAt}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="rounded-lg border p-4 space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Additional Metadata
                    </h4>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto font-mono">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Log ID */}
                <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
                  <span>Log ID</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {selectedLog.id}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(selectedLog.id, "logId")}
                    >
                      {copiedField === "logId" ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PageContainer>
    </AppLayout>
  )
}

export default function AuditLogsPage() {
  return (
    <ProtectedRoute>
      <AuditLogsContent />
    </ProtectedRoute>
  )
}
