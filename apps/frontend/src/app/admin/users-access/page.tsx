"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { BACKEND_API_CONFIG } from '@/lib/urls'
import { get, post, patch } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Users,
  UserPlus,
  Edit,
  Search,
  Mail,
  Phone,
  MapPin,
  Check,
  X,
} from "lucide-react"

import { useToast } from '@/hooks/use-toast'
import { Spinner } from '@/components/ui/spinner'
import { UserRole, ApiResponse } from '@fundifyhub/types'

type UserStatus = "active" | "inactive";

interface User {
  id: string
  firstName?: string
  lastName?: string
  name: string
  email: string
  phone?: string
  roles: string[] // multiple roles from backend
  status: UserStatus
  district?: string
  createdAt?: string
  lastLogin?: string
  _isActive?: boolean
}

// initial empty
const initialUsers: User[] = []

export default function UsersAccessPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState<Omit<User, "id" | "createdAt" | "lastLogin">>({
    name: "",
    email: "",
    phone: "",
    roles: ['CUSTOMER'],
    status: "active",
    district: "",
    _isActive: true
  })

  // Validation states for real-time checking
  const [emailValidation, setEmailValidation] = useState({ isValid: false, isChecking: false, error: "" })
  const [phoneValidation, setPhoneValidation] = useState({ isValid: false, isChecking: false, error: "" })

  const { toast } = useToast()

  // Fetch users from backend
  useEffect(() => {
    let mounted = true
    async function fetchUsers() {
      setIsLoading(true)
      try {

          const data = await get(BACKEND_API_CONFIG.ENDPOINTS.ADMIN.USERS) as ApiResponse<any>

        const list = (data.data || []).map((u: any) => {
          const firstName = u.firstName || ''
          const lastName = u.lastName || ''
          const name = `${firstName} ${lastName}`.trim() || u.email
          const roles: string[] = Array.isArray(u.roles) ? u.roles.map((r: string) => String(r).toUpperCase()) : []
          return {
            id: u.id,
            firstName,
            lastName,
            name,
            email: u.email,
            phone: u.phoneNumber || '',
            roles,
            status: u.isActive ? 'active' : 'inactive',
            district: u.district || '',
            createdAt: u.createdAt,
            lastLogin: u.lastLoginAt || '—',
            _isActive: !!u.isActive,
          }
        })
        if (mounted) setUsers(list)
      } catch (error) {
        console.error('fetchUsers error', error)
        toast({ title: 'Failed to load users', description: String(error), variant: 'destructive' })
      }
      finally {
        if (mounted) setIsLoading(false)
      }
    }

    fetchUsers()
    return () => { mounted = false }
  }, [toast])

  // Reset validation states when dialog opens/closes
  useEffect(() => {
    if (!isAddDialogOpen) {
      setEmailValidation({ isValid: false, isChecking: false, error: "" })
      setPhoneValidation({ isValid: false, isChecking: false, error: "" })
    }
  }, [isAddDialogOpen])

  // Real-time validation for email and phone
  useEffect(() => {
    if (newUser.email) {
      const timeout = setTimeout(() => checkEmailExists(newUser.email), 500)
      return () => clearTimeout(timeout)
    }
  }, [newUser.email])

  useEffect(() => {
    if (newUser.phone && newUser.phone.trim()) {
      const timeout = setTimeout(() => checkPhoneExists(newUser.phone!), 500)
      return () => clearTimeout(timeout)
    }
  }, [newUser.phone])

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
    
    const matchesRole = roleFilter === "all" || (Array.isArray(user.roles) && user.roles.map(r => r.toLowerCase()).includes(roleFilter.toLowerCase()))
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadge = (role: string) => {
    const normalized = String(role).toUpperCase()
    switch (normalized) {
      case 'SUPER_ADMIN':
        return <Badge className="bg-red-100 text-red-800">SUPER ADMIN</Badge>
      case 'ADMIN':
        return <Badge className="bg-purple-100 text-purple-800">ADMIN</Badge>
      case 'AGENT':
        return <Badge className="bg-blue-100 text-blue-800">AGENT</Badge>
      case 'DISTRICT_ADMIN':
        return <Badge className="bg-indigo-100 text-indigo-800">District Admin</Badge>
      case 'CUSTOMER':
        return <Badge variant="outline">Customer</Badge>
      default:
        return <Badge variant="secondary">{normalized}</Badge>
    }
  }

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Check if email exists
  const checkEmailExists = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailValidation({ isValid: false, isChecking: false, error: "Invalid email format" })
      return
    }

    setEmailValidation({ isValid: false, isChecking: true, error: "" })
    
    try {
  const data = await post(BACKEND_API_CONFIG.ENDPOINTS.AUTH.CHECK_AVAILABILITY, { email })

      if (data && data.success) {
        setEmailValidation({ isValid: true, isChecking: false, error: "" })
      } else {
        setEmailValidation({ isValid: false, isChecking: false, error: data?.message || "Email already exists" })
      }
    } catch (error) {
      setEmailValidation({ isValid: false, isChecking: false, error: "Unable to verify email" })
    }
  }

  // Check if phone exists
  const checkPhoneExists = async (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      setPhoneValidation({ isValid: false, isChecking: false, error: "Invalid phone number" })
      return
    }

    setPhoneValidation({ isValid: false, isChecking: true, error: "" })
    
    try {
  const data = await post(BACKEND_API_CONFIG.ENDPOINTS.AUTH.CHECK_AVAILABILITY, { phone })

      if (data && data.success) {
        setPhoneValidation({ isValid: true, isChecking: false, error: "" })
      } else {
        setPhoneValidation({ isValid: false, isChecking: false, error: data?.message || "Phone number already exists" })
      }
    } catch (error) {
      setPhoneValidation({ isValid: false, isChecking: false, error: "Unable to verify phone number" })
    }
  }

  const handleAddUser = async () => {
    // Basic validation
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast({ title: 'Validation Error', description: 'Name and email are required', variant: 'destructive' })
      return
    }

    // Ensure first name is provided
    const nameParts = newUser.name.trim().split(/\s+/)
    if (!nameParts[0]) {
      toast({ title: 'Validation Error', description: 'First name is required', variant: 'destructive' })
      return
    }

    try {
      // Split full name into first and last name
      const nameParts = newUser.name.trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const body = {
        email: newUser.email,
        firstName,
        lastName,
        phoneNumber: newUser.phone,
        district: newUser.district,
        roles: newUser.roles, // Send as array
        isActive: newUser._isActive ?? true,
      }

      const response = await post(BACKEND_API_CONFIG.ENDPOINTS.ADMIN.USERS, body)
      const createdUser = response.data

      // Add the created user to local state
      const user: User = {
        id: createdUser.id,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        name: `${createdUser.firstName} ${createdUser.lastName}`.trim(),
        email: createdUser.email,
        phone: createdUser.phoneNumber,
        roles: Array.isArray(createdUser.roles) ? createdUser.roles : [createdUser.role || 'CUSTOMER'],
        status: createdUser.isActive ? 'active' : 'inactive',
        district: createdUser.district,
        createdAt: createdUser.createdAt,
        lastLogin: 'Never',
        _isActive: !!createdUser.isActive,
      }

      setUsers(prev => [...prev, user])

      // Reset form
      setNewUser({
        name: "",
        email: "",
        phone: "",
        roles: ['CUSTOMER'],
        status: "active",
        district: "",
        _isActive: true
      })
      setEmailValidation({ isValid: false, isChecking: false, error: "" })
      setPhoneValidation({ isValid: false, isChecking: false, error: "" })
      setIsAddDialogOpen(false)
      toast({ title: 'User created successfully' })
    } catch (error) {
      console.error('create user error', error)
      toast({
        title: 'Failed to create user',
        description: String(error),
        variant: 'destructive'
      })
    }
  }

  // DELETE is intentionally not exposed in UI to avoid accidental removals.

  // --- Edit dialog state & handlers ---
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<{
    firstName: string
    lastName: string
    email: string
    phone: string
    district: string
    roles: string[]
    isActive: boolean
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const AVAILABLE_ROLES = Object.values(UserRole)

  // open editor
  const openEditor = (u: User) => {
    setEditingUser(u)
    setEditForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email,
      phone: u.phone || '',
      district: u.district || '',
      roles: Array.isArray(u.roles) ? u.roles.slice() : [],
      isActive: u._isActive ?? (u.status === 'active')
    })
  }

  const closeEditor = () => {
    setEditingUser(null)
    setEditForm(null)
  }

  const toggleRoleInForm = (role: string) => {
    if (!editForm) return
    const exists = editForm.roles.includes(role)
    const newRoles = exists ? editForm.roles.filter(r => r !== role) : [...editForm.roles, role]
    setEditForm({ ...editForm, roles: newRoles })
  }

  const handleSaveEdit = async () => {
    if (!editingUser || !editForm) return
    setIsSaving(true)
    try {
      const body = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phoneNumber: editForm.phone,
        district: editForm.district,
        roles: editForm.roles,
        isActive: editForm.isActive,
      }
      const payload = await patch(BACKEND_API_CONFIG.ENDPOINTS.ADMIN.USER_BY_ID(editingUser.id), body)
      const updated = payload.data
      // update local list
      setUsers(prev => prev.map(u => u.id === editingUser.id ? ({
        ...u,
        firstName: updated.firstName || editForm.firstName,
        lastName: updated.lastName || editForm.lastName,
        name: `${updated.firstName || editForm.firstName} ${updated.lastName || editForm.lastName}`.trim(),
        phone: updated.phoneNumber || editForm.phone,
        district: updated.district || editForm.district,
        roles: Array.isArray(updated.roles) ? updated.roles.map((r: string) => String(r).toUpperCase()) : editForm.roles,
        status: updated.isActive ? 'active' : 'inactive',
        _isActive: !!updated.isActive,
      }) : u))
      toast({ title: 'User updated' })
      closeEditor()
    } catch (error) {
      console.error('save edit error', error)
      toast({ title: 'Update failed', description: String(error), variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users & Access Management</h1>
            <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add New User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Add New User
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">Personal Information</h3>
                  <div>
                    <Label htmlFor="add-name">Full Name</Label>
                    <Input
                      id="add-name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="add-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="add-email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        placeholder="Enter email address"
                        className={`pl-10 pr-10 ${
                          emailValidation.error ? 'border-red-500' : 
                          emailValidation.isValid ? 'border-green-500' : ''
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {emailValidation.isChecking ? (
                          <Spinner size="sm" />
                        ) : emailValidation.isValid ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : emailValidation.error ? (
                          <X className="w-4 h-4 text-red-500" />
                        ) : null}
                      </div>
                    </div>
                    {emailValidation.error && (
                      <p className="text-sm text-red-600 mt-1">{emailValidation.error}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="add-phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="add-phone"
                          value={newUser.phone}
                          onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                          placeholder="Enter phone number"
                          className={`pl-10 pr-10 ${
                            phoneValidation.error ? 'border-red-500' : 
                            phoneValidation.isValid ? 'border-green-500' : ''
                          }`}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {phoneValidation.isChecking ? (
                            <Spinner size="sm" />
                          ) : phoneValidation.isValid ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : phoneValidation.error ? (
                            <X className="w-4 h-4 text-red-500" />
                          ) : null}
                        </div>
                      </div>
                      {phoneValidation.error && (
                        <p className="text-sm text-red-600 mt-1">{phoneValidation.error}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="add-district">District</Label>
                      <Input
                        id="add-district"
                        value={newUser.district}
                        onChange={(e) => setNewUser({...newUser, district: e.target.value})}
                        placeholder="Enter district"
                      />
                    </div>
                  </div>
                </div>

                {/* Roles Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">User Roles</h3>
                  <div>
                    <Label>Roles</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {AVAILABLE_ROLES.map((r) => {
                        const isSelected = newUser.roles.includes(r)
                        return (
                          <Badge
                            key={r}
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "hover:bg-muted"
                            }`}
                            onClick={() => {
                              const exists = newUser.roles.includes(r)
                              const newRoles = exists
                                ? newUser.roles.filter(role => role !== r)
                                : [...newUser.roles, r]
                              setNewUser({ ...newUser, roles: newRoles })
                            }}
                          >
                            {r.replace('_', ' ')}
                          </Badge>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click roles to add or remove them (Customer is default)
                    </p>
                  </div>
                </div>

                {/* Account Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">Account Status</h3>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label htmlFor="add-isActive" className="text-sm font-medium">Account Status</Label>
                      <p className="text-xs text-muted-foreground">New users are active by default</p>
                    </div>
                    <Switch
                      id="add-isActive"
                      checked={newUser._isActive ?? true}
                      onCheckedChange={(checked) => setNewUser({ ...newUser, _isActive: checked, status: checked ? "active" : "inactive" })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleAddUser}>
                    Add User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) closeEditor() }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit User Details
                </DialogTitle>
              </DialogHeader>
              {editForm ? (
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First name</Label>
                        <Input id="firstName" value={editForm.firstName} onChange={(e) => setEditForm({...editForm, firstName: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last name</Label>
                        <Input id="lastName" value={editForm.lastName} onChange={(e) => setEditForm({...editForm, lastName: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={editForm.email} disabled className="bg-muted" />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="district">District</Label>
                        <Input id="district" value={editForm.district} onChange={(e) => setEditForm({...editForm, district: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  {/* Roles Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">User Roles</h3>
                    <div>
                      <Label>Roles</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {AVAILABLE_ROLES.map((r) => {
                          const isSelected = editForm.roles.includes(r)
                          return (
                            <Badge
                              key={r}
                              variant={isSelected ? "default" : "outline"}
                              className={`cursor-pointer transition-colors ${
                                isSelected 
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                  : "hover:bg-muted"
                              }`}
                              onClick={() => toggleRoleInForm(r)}
                            >
                              {r.replace('_', ' ')}
                            </Badge>
                          )
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click roles to add or remove them
                      </p>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Account Status</h3>
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <Label htmlFor="isActive" className="text-sm font-medium">Account Status</Label>
                        <p className="text-xs text-muted-foreground">Toggle to activate or deactivate the user</p>
                      </div>
                      <Switch
                        id="isActive"
                        checked={editForm.isActive}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={closeEditor} disabled={isSaving} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit} disabled={isSaving} className="flex-1">
                      {isSaving ? <Spinner size="sm" /> : 'Save changes'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div />
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-lg font-semibold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-semibold">ADM</div>
                <div>
                  <p className="text-sm text-gray-600">Admins</p>
                  <p className="text-lg font-semibold">{users.filter(u => Array.isArray(u.roles) && u.roles.map(r => r.toUpperCase()).includes('ADMIN')).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center text-green-600 font-semibold">AG</div>
                <div>
                  <p className="text-sm text-muted-foreground">Agents</p>
                  <p className="text-lg font-semibold">{users.filter(u => Array.isArray(u.roles) && u.roles.map(r => r.toUpperCase()).includes('AGENT')).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Users className="w-4 h-4 text-orange-600 dark:text-orange-200" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customers</p>
                  <p className="text-lg font-semibold">{users.filter(u => Array.isArray(u.roles) && u.roles.map(r => r.toUpperCase()).includes('CUSTOMER')).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <div className="space-y-4">
          {isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-muted-foreground">Loading users…</p>
              </CardContent>
            </Card>
          )}
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                              <div className="flex gap-2">
                                {Array.isArray(user.roles) ? user.roles.map((r, idx) => (
                                  <span key={`${user.id}-role-${idx}`}>{getRoleBadge(r)}</span>
                                )) : getRoleBadge('CUSTOMER')}
                                {getStatusBadge(user.status)}
                              </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium truncate">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{user.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">District:</span>
                        <span className="font-medium">{user.district}</span>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Login:</p>
                        <p className="font-medium">{user.lastLogin}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditor(user)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground">No users match your search criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}