"use client"

import { useState, useMemo, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { ROLES, PERMISSION, hasPermission } from "@fundifyhub/types"
import { useDistricts } from "@/hooks/queries"
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/queries/useUsers"
import { useDebounce } from "@/hooks/useDebounce"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { redirect } from "next/navigation"
import toast from "@/lib/toast"
import { Pagination } from "@/components/ui/pagination"
import { UsersTableSkeleton } from "@/components/loading-skeletons"
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Users,
  UserCheck,
  UserX,
  Mail,
  MapPin,
  MoreHorizontal,
  Eye,
  Pencil,
  Power,
  Trash2,
  Phone,
  Calendar,
  Loader2,
  X,
  Check
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

interface UserData {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  districts: string[]
  isActive: boolean
  phoneNumber?: string
  createdAt?: string | Date
  updatedAt?: string | Date
  _count?: {
    requests?: number
    loans?: number
  }
}

// Skeleton for loading state
function UsersSkeleton() {
  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <Skeleton className="h-10 flex-1 min-w-[200px]" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
              </div>
            </CardContent>
          </Card>
          <UsersTableSkeleton rows={5} />
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "destructive" | "outline" {
  switch (role.toUpperCase()) {
    case ROLES.SUPER_ADMIN:
      return "destructive"
    case ROLES.DISTRICT_ADMIN:
      return "default"
    case ROLES.AGENT:
      return "secondary"
    default:
      return "outline"
  }
}

function formatDate(date: string | Date | undefined): string {
  if (!date) return '-'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const roleOptions = [
  { value: ROLES.CUSTOMER, label: "Customer" },
  { value: ROLES.AGENT, label: "Agent" },
  { value: ROLES.DISTRICT_ADMIN, label: "District Admin" },
  { value: ROLES.SUPER_ADMIN, label: "Super Admin" },
]

function UsersContent() {
  const { user, isLoading: authLoading } = useAuth()
  
  // Filters & Pagination
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [districtFilter, setDistrictFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Debounce search for better performance
  const debouncedSearch = useDebounce(search, 300)

  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    roles: [] as string[],
    districts: [] as string[],
    isActive: true
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const userRoles = user?.roles || []
  const canViewUsers = hasPermission(userRoles, PERMISSION.VIEW_ALL_USERS)
  const isSuperAdmin = userRoles.map((r: string) => r.toUpperCase()).includes(ROLES.SUPER_ADMIN)

  // Fetch districts from API
  const { data: districts = [], isLoading: districtsLoading } = useDistricts()

  // Build filter params for React Query
  const filterParams = useMemo(() => ({
    page,
    limit,
    role: roleFilter !== "all" ? roleFilter : undefined,
    district: districtFilter !== "all" ? districtFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearch || undefined,
  }), [page, limit, roleFilter, districtFilter, statusFilter, debouncedSearch])

  // Fetch users with React Query
  const usersQuery = useUsers(filterParams, { enabled: canViewUsers && !authLoading })
  
  // Mutations
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()

  // Derived data
  const users = usersQuery.data?.users ?? []
  const pagination = usersQuery.data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }
  const loading = usersQuery.isLoading
  const isRefetching = usersQuery.isFetching && !usersQuery.isLoading
  const error = usersQuery.error?.message || null

  // Only admins can view users
  if (!authLoading && user && !canViewUsers) {
    redirect("/dashboard")
  }

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [roleFilter, districtFilter, statusFilter, debouncedSearch])

  // Form validation
  const validateForm = (isEdit: boolean = false): boolean => {
    const errors: Record<string, string> = {}
    
    if (!isEdit && !formData.email.trim()) {
      errors.email = "Email is required"
    } else if (!isEdit && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format"
    }
    
    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required"
    }
    
    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      errors.phoneNumber = "Phone number must be 10 digits"
    }
    
    if (formData.roles.length === 0) {
      errors.roles = "At least one role is required"
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle create user
  const handleCreateUser = async () => {
    if (!validateForm()) return

    try {
      await createUserMutation.mutateAsync({
        email: formData.email.toLowerCase().trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim() || "",
        roles: formData.roles,
      })
      
      toast.success("User created successfully", {
        description: "A temporary password has been generated."
      })
      setShowCreateModal(false)
      resetForm()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error.message || "Failed to create user")
    }
  }

  // Handle update user
  const handleUpdateUser = async () => {
    if (!selectedUser || !validateForm(true)) return

    try {
      await updateUserMutation.mutateAsync({
        id: selectedUser.id,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        roles: formData.roles,
        accountStatus: formData.isActive ? 'ACTIVE' : 'SUSPENDED',
      })
      
      toast.success("User updated successfully")
      setShowEditModal(false)
      resetForm()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error.message || "Failed to update user")
    }
  }

  // Handle toggle active status
  const handleToggleActive = async (userData: UserData) => {
    try {
      await updateUserMutation.mutateAsync({
        id: userData.id,
        accountStatus: userData.isActive ? 'SUSPENDED' : 'ACTIVE',
      })
      
      toast.success(`User ${userData.isActive ? 'deactivated' : 'activated'} successfully`)
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error.message || "Failed to update user")
    }
  }

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      await deleteUserMutation.mutateAsync(selectedUser.id)
      
      toast.success("User deleted successfully")
      setShowDeleteConfirm(false)
      setSelectedUser(null)
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error.message || "Failed to delete user")
    }
  }

  // Mutation loading states
  const formLoading = createUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending

  // Reset form
  const resetForm = () => {
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      roles: [ROLES.CUSTOMER],
      districts: [],
      isActive: true
    })
    setFormErrors({})
    setSelectedUser(null)
  }

  // Open view modal
  const openViewModal = (userData: UserData) => {
    setSelectedUser(userData)
    setShowViewModal(true)
  }

  // Open edit modal
  const openEditModal = (userData: UserData) => {
    setSelectedUser(userData)
    setFormData({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName || "",
      phoneNumber: userData.phoneNumber || "",
      roles: userData.roles,
      districts: userData.districts || [],
      isActive: userData.isActive
    })
    setFormErrors({})
    setShowEditModal(true)
  }

  // Open create modal
  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  // Open delete confirmation
  const openDeleteConfirm = (userData: UserData) => {
    setSelectedUser(userData)
    setShowDeleteConfirm(true)
  }

  // Toggle role in form
  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }))
  }

  // Toggle district in form
  const toggleDistrict = (district: string) => {
    setFormData(prev => ({
      ...prev,
      districts: prev.districts.includes(district)
        ? prev.districts.filter(d => d !== district)
        : [...prev.districts, district]
    }))
  }

  if (authLoading) {
    return <UsersSkeleton />
  }

  if (!user) {
    return null
  }

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title="User Management"
          description="View and manage all users on the platform."
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => usersQuery.refetch()} 
                disabled={loading || isRefetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {isSuperAdmin && (
                <Button onClick={openCreateModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              )}
            </div>
          }
        />

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Role Filter */}
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roleOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* District Filter */}
              <Select value={districtFilter} onValueChange={setDistrictFilter} disabled={districtsLoading}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder={districtsLoading ? "Loading..." : "All Districts"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {districts.map(district => (
                    <SelectItem key={district.id} value={district.id}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive mb-6">
            {error}
            <Button variant="link" className="ml-2 p-0 h-auto" onClick={() => usersQuery.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <Card>
            <CardContent className="p-0">
              <div className="space-y-0">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : users.length > 0 ? (
          <>
            {/* Users Table */}
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">District</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userData) => (
                      <TableRow key={userData.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-medium text-primary uppercase">
                                {userData.firstName?.[0]}{userData.lastName?.[0] || ''}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {userData.firstName} {userData.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{userData.email}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {userData.roles.slice(0, 2).map((role) => (
                              <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs">
                                {role.toLowerCase().replace(/_/g, " ")}
                              </Badge>
                            ))}
                            {userData.roles.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{userData.roles.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[150px]">
                              {userData.districts?.length > 0 
                                ? userData.districts.slice(0, 2).join(", ") + (userData.districts.length > 2 ? ` +${userData.districts.length - 2}` : '')
                                : "-"
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {userData.isActive ? (
                            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:bg-red-950">
                              <UserX className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(userData.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openViewModal(userData)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuItem onClick={() => openEditModal(userData)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit User
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleToggleActive(userData)}>
                                    <Power className="h-4 w-4 mr-2" />
                                    {userData.isActive ? "Deactivate" : "Activate"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => openDeleteConfirm(userData)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Pagination */}
            {pagination.totalPages > 0 && (
              <div className="mt-6">
                <Pagination
                  page={page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={limit}
                  onPageChange={setPage}
                  onPageSizeChange={(newLimit) => {
                    setLimit(newLimit)
                    setPage(1)
                  }}
                />
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No users found</h3>
                <p className="text-muted-foreground mb-6">
                  {search || roleFilter !== "all" || districtFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters to see more results."
                    : "No users have been registered yet."
                  }
                </p>
                {isSuperAdmin && (
                  <Button onClick={openCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First User
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* View User Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Detailed information about this user.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-semibold text-primary uppercase">
                      {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0] || ''}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedUser.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{selectedUser.email}</span>
                  </div>
                  {selectedUser.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{selectedUser.phoneNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Joined:</span>
                    <span className="font-medium">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-sm text-muted-foreground">Roles</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedUser.roles.map(role => (
                      <Badge key={role} variant={getRoleBadgeVariant(role)}>
                        {role.toLowerCase().replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedUser.districts?.length > 0 && (
                  <div className="pt-4 border-t">
                    <Label className="text-sm text-muted-foreground">Districts</Label>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedUser.districts.map(district => (
                        <Badge key={district} variant="secondary">
                          {district}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedUser._count && (
                  <div className="pt-4 border-t grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Requests</Label>
                      <p className="text-2xl font-bold">{selectedUser._count.requests || 0}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Loans</Label>
                      <p className="text-2xl font-bold">{selectedUser._count.loans || 0}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
              {isSuperAdmin && selectedUser && (
                <Button onClick={() => {
                  setShowViewModal(false)
                  openEditModal(selectedUser)
                }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create/Edit User Modal */}
        <Dialog 
          open={showCreateModal || showEditModal} 
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateModal(false)
              setShowEditModal(false)
              resetForm()
            }
          }}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{showEditModal ? "Edit User" : "Create New User"}</DialogTitle>
              <DialogDescription>
                {showEditModal 
                  ? "Update user information and permissions."
                  : "Add a new user to the platform. They will receive login credentials via email."
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={showEditModal || formLoading}
                  className={formErrors.email ? "border-destructive" : ""}
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive">{formErrors.email}</p>
                )}
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    disabled={formLoading}
                    className={formErrors.firstName ? "border-destructive" : ""}
                  />
                  {formErrors.firstName && (
                    <p className="text-sm text-destructive">{formErrors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    disabled={formLoading}
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="9876543210"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  disabled={formLoading}
                  className={formErrors.phoneNumber ? "border-destructive" : ""}
                />
                {formErrors.phoneNumber && (
                  <p className="text-sm text-destructive">{formErrors.phoneNumber}</p>
                )}
              </div>

              {/* Roles */}
              <div className="space-y-2">
                <Label>
                  Roles <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${option.value}`}
                        checked={formData.roles.includes(option.value)}
                        onCheckedChange={() => toggleRole(option.value)}
                        disabled={formLoading}
                      />
                      <label
                        htmlFor={`role-${option.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
                {formErrors.roles && (
                  <p className="text-sm text-destructive">{formErrors.roles}</p>
                )}
              </div>

              {/* Districts - Show only for non-customer roles */}
              {(formData.roles.includes(ROLES.DISTRICT_ADMIN) || 
                formData.roles.includes(ROLES.AGENT)) && (
                <div className="space-y-2">
                  <Label>Assigned Districts</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                    {districtsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading districts...</p>
                    ) : districts.map(district => (
                      <div key={district.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`district-${district.id}`}
                          checked={formData.districts.includes(district.id)}
                          onCheckedChange={() => toggleDistrict(district.id)}
                          disabled={formLoading}
                        />
                        <label
                          htmlFor={`district-${district.id}`}
                          className="text-sm leading-none cursor-pointer"
                        >
                          {district.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select districts this user can manage
                  </p>
                </div>
              )}

              {/* Active Status */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Account Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.isActive ? "User can login and access the platform" : "User cannot login"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={formData.isActive ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  disabled={formLoading}
                >
                  {formData.isActive ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Inactive
                    </>
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  resetForm()
                }}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={showEditModal ? handleUpdateUser : handleCreateUser}
                disabled={formLoading}
              >
                {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {showEditModal ? "Save Changes" : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="py-4">
                <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-destructive uppercase">
                      {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0] || ''}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={formLoading}
              >
                {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </AppLayout>
  )
}

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <UsersContent />
    </ProtectedRoute>
  )
}
