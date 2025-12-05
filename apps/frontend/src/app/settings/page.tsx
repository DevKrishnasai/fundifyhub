"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { ROLES, PERMISSION, hasPermission, SERVICE_NAMES, CONNECTION_STATUS, profileUpdateSchema, changePasswordSchema, emailConfigSchema } from "@fundifyhub/types"
import type { ServiceConfigType, EmailConfigType } from "@fundifyhub/types"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import { apiClient, getErrorMessage } from "@/lib/api-client"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import toast from "@/lib/toast"
import { 
  User, Bell, Shield, Settings2, Loader2, CheckCircle, 
  XCircle, Power, AlertTriangle, Mail, MessageSquare, Settings, RefreshCw, 
  Eye, EyeOff, Wifi, WifiOff, Clock, QrCode
} from "lucide-react"

const SERVICE_DISPLAY_INFO: Record<SERVICE_NAMES, { displayName: string; description: string; icon: React.ElementType }> = {
  [SERVICE_NAMES.EMAIL]: {
    displayName: "Email Service",
    description: "Send OTPs, notifications and alerts via email (Nodemailer)",
    icon: Mail,
  },
  [SERVICE_NAMES.WHATSAPP]: {
    displayName: "WhatsApp Service",
    description: "Send notifications via WhatsApp (whatsapp-web-js)",
    icon: MessageSquare,
  },
}

function SettingsSkeleton() {
  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function ProfileSettings() {
  const { user, refresh } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [firstName, setFirstName] = useState(user?.firstName || "")
  const [lastName, setLastName] = useState(user?.lastName || "")
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Reset form when user changes or edit mode is cancelled
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "")
      setLastName(user.lastName || "")
      setPhoneNumber(user.phoneNumber || "")
    }
  }, [user])

  const handleCancel = () => {
    setFirstName(user?.firstName || "")
    setLastName(user?.lastName || "")
    setPhoneNumber(user?.phoneNumber || "")
    setFormErrors({})
    setIsEditing(false)
  }

  const validateForm = (): boolean => {
    const result = profileUpdateSchema.safeParse({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.replace(/\s/g, '') || undefined,
    })
    
    if (!result.success) {
      const errors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string
        errors[field] = err.message
      })
      setFormErrors(errors)
      return false
    }
    
    setFormErrors({})
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return
    
    // Check if there are actual changes
    const hasChanges = 
      firstName.trim() !== (user?.firstName || "") ||
      lastName.trim() !== (user?.lastName || "") ||
      phoneNumber.replace(/\s/g, '') !== (user?.phoneNumber || "")
    
    if (!hasChanges) {
      toast.info("No changes to save")
      setIsEditing(false)
      return
    }
    
    setIsSaving(true)
    try {
      const res = await apiClient.put(BACKEND_API_CONFIG.ENDPOINTS.USER.UPDATE_PROFILE, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.replace(/\s/g, '') || undefined,
      })
      
      if (res.data?.success) {
        toast.success("Profile updated successfully")
        await refresh()
        setIsEditing(false)
        setFormErrors({})
      } else {
        throw new Error(res.data?.message || "Failed to update profile")
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const message = error.response?.data?.message || error.message || "Failed to update profile"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your personal details</CardDescription>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              {isEditing ? (
                <>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    disabled={isSaving}
                    className={formErrors.firstName ? "border-destructive" : ""}
                  />
                  {formErrors.firstName && (
                    <p className="text-sm text-destructive">{formErrors.firstName}</p>
                  )}
                </>
              ) : (
                <p className="font-medium py-2">{user?.firstName || "-"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              {isEditing ? (
                <>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    disabled={isSaving}
                    className={formErrors.lastName ? "border-destructive" : ""}
                  />
                  {formErrors.lastName && (
                    <p className="text-sm text-destructive">{formErrors.lastName}</p>
                  )}
                </>
              ) : (
                <p className="font-medium py-2">{user?.lastName || "-"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="font-medium py-2 text-muted-foreground">{user?.email || "-"}</p>
              {isEditing && (
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              {isEditing ? (
                <>
                  <Input
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number (e.g., +919876543210)"
                    disabled={isSaving}
                    className={formErrors.phoneNumber ? "border-destructive" : ""}
                  />
                  {formErrors.phoneNumber && (
                    <p className="text-sm text-destructive">{formErrors.phoneNumber}</p>
                  )}
                </>
              ) : (
                <p className="font-medium py-2">{user?.phoneNumber || "-"}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Districts</Label>
              <div className="flex flex-wrap gap-1 py-2">
                {user?.districts?.length ? (
                  user.districts.map((d) => (
                    <Badge key={d} variant="secondary">{d}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">No districts assigned</span>
                )}
              </div>
              {isEditing && (
                <p className="text-xs text-muted-foreground">Districts are managed by administrators</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex flex-wrap gap-1 py-2">
                {user?.roles?.map((r) => (
                  <Badge key={r} variant="outline" className="capitalize">
                    {r.toLowerCase().replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account Status</Label>
              <div className="py-2">
                <Badge variant={user?.isActive ? "default" : "destructive"}>
                  {user?.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SMS Notifications</p>
              <p className="text-sm text-muted-foreground">Receive SMS for important updates</p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">WhatsApp Notifications</p>
              <p className="text-sm text-muted-foreground">Receive updates via WhatsApp</p>
            </div>
            <Switch defaultChecked disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>Select which notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Loan Updates</p>
              <p className="text-sm text-muted-foreground">Status changes on your loan requests</p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Payment Reminders</p>
              <p className="text-sm text-muted-foreground">EMI due date reminders</p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">System Alerts</p>
              <p className="text-sm text-muted-foreground">Important system announcements</p>
            </div>
            <Switch defaultChecked disabled />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/20 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Coming Soon</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-500">
              Notification preferences management will be available in a future update.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  const validatePasswordForm = (): boolean => {
    // First validate current and new password with Zod
    const result = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
    })
    
    const errors: Record<string, string> = {}
    
    if (!result.success) {
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string
        errors[field] = err.message
      })
    }
    
    // Additional confirm password check (not in schema since it's frontend-only)
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your new password"
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }
    
    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return
    
    setIsChangingPassword(true)
    try {
      const res = await apiClient.post(BACKEND_API_CONFIG.ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        currentPassword,
        newPassword,
      })
      
      if (res.data?.success) {
        toast.success("Password changed successfully")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setPasswordErrors({})
      } else {
        throw new Error(res.data?.message || "Failed to change password")
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const message = error.response?.data?.message || error.message || "Failed to change password"
      toast.error(message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isChangingPassword}
                className={passwordErrors.currentPassword ? "border-destructive" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {passwordErrors.currentPassword && (
              <p className="text-sm text-destructive">{passwordErrors.currentPassword}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isChangingPassword}
                className={passwordErrors.newPassword ? "border-destructive" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {passwordErrors.newPassword && (
              <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isChangingPassword}
              className={passwordErrors.confirmPassword ? "border-destructive" : ""}
            />
            {passwordErrors.confirmPassword && (
              <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
            )}
          </div>
          <Button 
            onClick={handleChangePassword} 
            disabled={isChangingPassword}
            className="w-full sm:w-auto"
          >
            {isChangingPassword ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Changing Password...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">2FA is not enabled</p>
                <p className="text-sm text-muted-foreground">Protect your account with two-factor authentication</p>
              </div>
            </div>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Current Session</p>
              <p className="text-sm text-muted-foreground">This device</p>
            </div>
            <Badge variant="outline" className="text-green-600">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SystemSettings() {
  const [services, setServices] = useState<ServiceConfigType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<SERVICE_NAMES | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [emailConfig, setEmailConfig] = useState<EmailConfigType>({
    host: "",
    port: 587,
    user: "",
    password: "",
    from: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [testLoading, setTestLoading] = useState<string | null>(null)
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(0)
  const [testPhoneModalOpen, setTestPhoneModalOpen] = useState(false)
  const [testPhoneNumber, setTestPhoneNumber] = useState("")

  // Fetch services - with option to skip cache for fresh data
  const fetchServices = useCallback(async (options?: { showRefreshing?: boolean; fresh?: boolean }) => {
    const { showRefreshing = false, fresh = false } = options || {}
    if (showRefreshing) setIsRefreshing(true)
    setFetchError(null)
    try {
      // Add ?fresh=true to skip backend cache when polling
      const url = fresh 
        ? `${BACKEND_API_CONFIG.ENDPOINTS.ADMIN.SERVICES}?fresh=true`
        : BACKEND_API_CONFIG.ENDPOINTS.ADMIN.SERVICES
      const response = await apiClient.get(url)
      setServices(response.data.data || [])
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to load services")
      setFetchError(message)
      if (!isPolling) {
        toast.error(message)
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [isPolling])

  // Initial fetch
  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  // Check if we need to poll for service status changes
  const whatsappService = services.find((s) => s.serviceName === SERVICE_NAMES.WHATSAPP)
  const emailService = services.find((s) => s.serviceName === SERVICE_NAMES.EMAIL)
  
  // Poll when WhatsApp is initializing/connecting/waiting for QR
  const whatsappNeedsPolling = whatsappService?.isEnabled && (
    whatsappService.connectionStatus === CONNECTION_STATUS.INITIALIZING ||
    whatsappService.connectionStatus === CONNECTION_STATUS.CONNECTING ||
    whatsappService.connectionStatus === CONNECTION_STATUS.WAITING_FOR_QR_SCAN
  )
  
  // Poll when Email is enabled but not yet connected (brief startup period)
  const emailNeedsPolling = emailService?.isEnabled && (
    emailService.connectionStatus === CONNECTION_STATUS.INITIALIZING ||
    emailService.connectionStatus === CONNECTION_STATUS.CONNECTING
  )
  
  const needsPolling = whatsappNeedsPolling || emailNeedsPolling

  // Polling effect for WhatsApp status updates
  useEffect(() => {
    if (!needsPolling) {
      setIsPolling(false)
      setAutoRefreshCountdown(0)
      return
    }

    setIsPolling(true)
    const POLL_INTERVAL = 3 // seconds
    setAutoRefreshCountdown(POLL_INTERVAL)

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 1) return POLL_INTERVAL
        return prev - 1
      })
    }, 1000)

    // Poll interval
    const pollInterval = setInterval(() => {
      fetchServices({ fresh: true })
      setAutoRefreshCountdown(POLL_INTERVAL)
    }, POLL_INTERVAL * 1000)

    return () => {
      clearInterval(pollInterval)
      clearInterval(countdownInterval)
      setIsPolling(false)
      setAutoRefreshCountdown(0)
    }
  }, [needsPolling, fetchServices])

  const handleServiceToggle = async (serviceName: SERVICE_NAMES, currentlyEnabled: boolean) => {
    setActionLoading(serviceName)
    try {
      const endpoint = currentlyEnabled 
        ? BACKEND_API_CONFIG.ENDPOINTS.ADMIN.SERVICE_DISABLE(serviceName)
        : BACKEND_API_CONFIG.ENDPOINTS.ADMIN.SERVICE_ENABLE(serviceName)
      
      await apiClient.post(endpoint)
      toast.success(`${SERVICE_DISPLAY_INFO[serviceName].displayName} ${currentlyEnabled ? "disabled" : "enabled"} successfully`)
      // Fetch fresh data after toggle
      await fetchServices({ fresh: true })
    } catch (error: unknown) {
      const message = getErrorMessage(error, `Failed to toggle ${SERVICE_DISPLAY_INFO[serviceName].displayName}`)
      toast.error(message)
    } finally {
      setActionLoading(null)
    }
  }

  const openConfigModal = (serviceName: SERVICE_NAMES) => {
    setSelectedService(serviceName)
    const service = services.find((s) => s.serviceName === serviceName)
    
    if (serviceName === SERVICE_NAMES.EMAIL && service?.config) {
      const config = service.config as EmailConfigType
      setEmailConfig({
        host: config.host || "",
        port: config.port || 587,
        user: config.user || "",
        password: config.password || "",
        from: config.from || "",
      })
    } else {
      setEmailConfig({ host: "", port: 587, user: "", password: "", from: "" })
    }
    setShowPassword(false)
    setConfigModalOpen(true)
  }

  const openQrModal = () => {
    setQrModalOpen(true)
  }

  const handleSaveConfig = async () => {
    if (!selectedService) return
    
    if (selectedService === SERVICE_NAMES.EMAIL) {
      const result = emailConfigSchema.safeParse(emailConfig)
      if (!result.success) {
        const firstError = result.error.errors[0]
        toast.error(firstError?.message || "Invalid configuration")
        return
      }
    }
    
    setIsSaving(true)
    try {
      await apiClient.post(
        BACKEND_API_CONFIG.ENDPOINTS.ADMIN.SERVICE_CONFIGURE(selectedService),
        emailConfig
      )
      toast.success(`${SERVICE_DISPLAY_INFO[selectedService].displayName} configured successfully. A test email has been sent to verify.`)
      setConfigModalOpen(false)
      await fetchServices({ fresh: true })
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to save configuration")
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestService = async (serviceName: SERVICE_NAMES, phoneNumber?: string) => {
    // WhatsApp requires a phone number
    if (serviceName === SERVICE_NAMES.WHATSAPP && !phoneNumber) {
      setTestPhoneModalOpen(true)
      return
    }
    
    setTestLoading(serviceName)
    try {
      const payload = serviceName === SERVICE_NAMES.WHATSAPP ? { phoneNumber } : {}
      await apiClient.post(BACKEND_API_CONFIG.ENDPOINTS.ADMIN.SERVICE_TEST(serviceName), payload)
      toast.success(`${SERVICE_DISPLAY_INFO[serviceName].displayName} test initiated. Check your ${serviceName === SERVICE_NAMES.EMAIL ? "email inbox" : "WhatsApp"} for verification.`)
      setTestPhoneModalOpen(false)
      setTestPhoneNumber("")
    } catch (error: unknown) {
      const message = getErrorMessage(error, `Failed to test ${SERVICE_DISPLAY_INFO[serviceName].displayName}`)
      toast.error(message)
    } finally {
      setTestLoading(null)
    }
  }
  
  const handleTestWhatsApp = () => {
    if (!testPhoneNumber.trim()) {
      toast.error("Please enter a phone number")
      return
    }
    handleTestService(SERVICE_NAMES.WHATSAPP, testPhoneNumber)
  }

  const getConnectionStatusBadge = (service: ServiceConfigType) => {
    const status = service.connectionStatus
    
    if (!service.isEnabled) {
      return (
        <Badge variant="outline" className="gap-1">
          <WifiOff className="h-3 w-3" />
          Disabled
        </Badge>
      )
    }
    
    switch (status) {
      case CONNECTION_STATUS.CONNECTED:
      case CONNECTION_STATUS.AUTHENTICATED:
        return (
          <Badge className="bg-green-500 hover:bg-green-600 gap-1">
            <Wifi className="h-3 w-3" />
            Connected
          </Badge>
        )
      case CONNECTION_STATUS.CONNECTING:
      case CONNECTION_STATUS.INITIALIZING:
        return (
          <Badge variant="secondary" className="gap-1 animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting...
          </Badge>
        )
      case CONNECTION_STATUS.WAITING_FOR_QR_SCAN:
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 gap-1">
            <QrCode className="h-3 w-3" />
            Scan QR Code
          </Badge>
        )
      case CONNECTION_STATUS.DISCONNECTED:
        return (
          <Badge variant="outline" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Disconnected
          </Badge>
        )
      case CONNECTION_STATUS.ERROR:
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {status}
          </Badge>
        )
    }
  }

  const getServiceStatusIcon = (service: ServiceConfigType) => {
    if (!service.isEnabled) {
      return <XCircle className="h-5 w-5 text-muted-foreground" />
    }
    if (service.connectionStatus === CONNECTION_STATUS.CONNECTED || 
        service.connectionStatus === CONNECTION_STATUS.AUTHENTICATED) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    if (service.connectionStatus === CONNECTION_STATUS.ERROR) {
      return <XCircle className="h-5 w-5 text-destructive" />
    }
    if (service.connectionStatus === CONNECTION_STATUS.CONNECTING || 
        service.connectionStatus === CONNECTION_STATUS.INITIALIZING) {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
    }
    if (service.connectionStatus === CONNECTION_STATUS.WAITING_FOR_QR_SCAN) {
      return <QrCode className="h-5 w-5 text-yellow-500" />
    }
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />
  }

  const hasConfig = (service: ServiceConfigType): boolean => {
    if (service.serviceName === SERVICE_NAMES.EMAIL) {
      const config = service.config as EmailConfigType | undefined
      return Boolean(config?.host && config?.user)
    }
    return true // WhatsApp doesn't need pre-configuration
  }

  const getWhatsAppService = () => services.find((s) => s.serviceName === SERVICE_NAMES.WHATSAPP)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Service Configuration</CardTitle>
              <CardDescription>Manage external service integrations for notifications</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {isPolling && autoRefreshCountdown > 0 && (
                <span className="text-sm text-muted-foreground">
                  Auto-refresh in {autoRefreshCountdown}s
                </span>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { 
                  fetchServices({ showRefreshing: true, fresh: true })
                  // Reset countdown on manual refresh
                  if (isPolling) setAutoRefreshCountdown(3)
                }} 
                disabled={isLoading || isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          ) : fetchError ? (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">{fetchError}</p>
              <Button variant="outline" className="mt-4" onClick={() => fetchServices()}>
                Try Again
              </Button>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <Settings2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No services available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => {
                const displayInfo = SERVICE_DISPLAY_INFO[service.serviceName]
                const ServiceIcon = displayInfo?.icon || Power
                const isActionLoading = actionLoading === service.serviceName
                
                return (
                  <div key={service.serviceName} className="border rounded-lg p-4 transition-all hover:shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${service.isEnabled ? "bg-primary/10" : "bg-muted"}`}>
                          <ServiceIcon className={`h-6 w-6 ${service.isEnabled ? "text-primary" : ""}`} />
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold">{displayInfo?.displayName || service.serviceName}</h4>
                            {getConnectionStatusBadge(service)}
                          </div>
                          <p className="text-sm text-muted-foreground">{displayInfo?.description || "Service integration"}</p>
                          
                          {/* Show SMTP config info for email */}
                          {service.serviceName === SERVICE_NAMES.EMAIL && hasConfig(service) && (
                            <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted px-2 py-1 rounded inline-block">
                              SMTP: {(service.config as EmailConfigType)?.host}:{(service.config as EmailConfigType)?.port}
                            </p>
                          )}
                          
                          {/* Show error message */}
                          {service.lastError && (
                            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                              <XCircle className="h-4 w-4 inline mr-2" />
                              {service.lastError}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 ml-auto">
                        {/* Configure button for Email */}
                        {service.serviceName === SERVICE_NAMES.EMAIL && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openConfigModal(service.serviceName)}
                            disabled={isActionLoading}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                        )}
                        
                        {/* Test button - show only when service is connected */}
                        {service.isEnabled && 
                         (service.connectionStatus === CONNECTION_STATUS.CONNECTED || 
                          service.connectionStatus === CONNECTION_STATUS.AUTHENTICATED) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleTestService(service.serviceName)}
                            disabled={testLoading === service.serviceName || isActionLoading}
                          >
                            {testLoading === service.serviceName ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Test
                              </>
                            )}
                          </Button>
                        )}
                        
                        {/* Show QR button for WhatsApp when waiting for scan */}
                        {service.serviceName === SERVICE_NAMES.WHATSAPP && 
                         service.connectionStatus === CONNECTION_STATUS.WAITING_FOR_QR_SCAN && 
                         service.qrCode && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={openQrModal}
                            className="bg-yellow-50 border-yellow-300 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-800"
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            Show QR Code
                          </Button>
                        )}
                        
                        {/* Enable/Disable switch */}
                        <div className="flex items-center gap-2 pl-2 border-l">
                          {getServiceStatusIcon(service)}
                          <Switch
                            checked={service.isEnabled}
                            onCheckedChange={() => handleServiceToggle(service.serviceName, service.isEnabled)}
                            disabled={isActionLoading || (service.serviceName === SERVICE_NAMES.EMAIL && !hasConfig(service))}
                          />
                          {isActionLoading && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Warning for unconfigured email */}
                    {service.serviceName === SERVICE_NAMES.EMAIL && !hasConfig(service) && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Configure SMTP settings before enabling the email service</span>
                        </p>
                      </div>
                    )}
                    
                    {/* Info for WhatsApp when connecting */}
                    {service.serviceName === SERVICE_NAMES.WHATSAPP && 
                     service.isEnabled && 
                     (service.connectionStatus === CONNECTION_STATUS.CONNECTING || 
                      service.connectionStatus === CONNECTION_STATUS.INITIALIZING) && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          <span>WhatsApp is initializing. A QR code will appear when ready to scan.</span>
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
          <CardDescription>Configure platform-wide settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">Temporarily disable access for maintenance</p>
            </div>
            <Switch disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Registrations</p>
              <p className="text-sm text-muted-foreground">Allow new user registrations</p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Loan Applications</p>
              <p className="text-sm text-muted-foreground">Accept new loan applications</p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/20 p-4 mt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-400">Coming Soon</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-500">
                  Platform-wide settings will be configurable in a future update.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Configuration Modal - Responsive */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Service Configuration
            </DialogTitle>
            <DialogDescription>
              Configure your SMTP settings for sending emails. A test email will be sent to verify the configuration.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host <span className="text-destructive">*</span></Label>
              <Input
                id="smtp-host"
                placeholder="smtp.gmail.com"
                value={emailConfig.host}
                onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                disabled={isSaving}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP Port <span className="text-destructive">*</span></Label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="587"
                min={1}
                max={65535}
                value={emailConfig.port}
                onChange={(e) => setEmailConfig({ ...emailConfig, port: parseInt(e.target.value) || 587 })}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">Common ports: 587 (TLS), 465 (SSL), 25 (unencrypted)</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-user">Username / Email <span className="text-destructive">*</span></Label>
              <Input
                id="smtp-user"
                type="email"
                placeholder="your-email@gmail.com"
                value={emailConfig.user}
                onChange={(e) => setEmailConfig({ ...emailConfig, user: e.target.value })}
                disabled={isSaving}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">Password / App Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="smtp-pass"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your SMTP password or app password"
                  value={emailConfig.password}
                  onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                  disabled={isSaving}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSaving}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-from">From Email Address <span className="text-destructive">*</span></Label>
              <Input
                id="smtp-from"
                type="email"
                placeholder="noreply@fundifyhub.com"
                value={emailConfig.from}
                onChange={(e) => setEmailConfig({ ...emailConfig, from: e.target.value })}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">This will appear as the sender address</p>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 Tip:</strong> For Gmail, use an{" "}
                <a 
                  href="https://support.google.com/accounts/answer/185833" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline font-medium"
                >
                  App Password
                </a>{" "}
                instead of your regular password. Enable 2FA on your Google account first.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setConfigModalOpen(false)} 
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveConfig} 
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing & Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save & Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              WhatsApp QR Code
            </DialogTitle>
            <DialogDescription>
              Scan this QR code with your WhatsApp to connect.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-4">
            {(() => {
              const whatsappService = getWhatsAppService()
              if (whatsappService?.qrCode) {
                return (
                  <div className="p-4 bg-white rounded-lg shadow-sm border">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic QR code from WhatsApp service */}
                    <img 
                      src={whatsappService.qrCode} 
                      alt="WhatsApp QR Code" 
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                )
              }
              return (
                <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading QR Code...</p>
                  </div>
                </div>
              )
            })()}
            
            <div className="mt-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { setQrModalOpen(false); fetchServices({ showRefreshing: true, fresh: true }); }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Test Phone Number Modal */}
      <Dialog open={testPhoneModalOpen} onOpenChange={setTestPhoneModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Test WhatsApp
            </DialogTitle>
            <DialogDescription>
              Enter a phone number to send a test message.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">Phone Number (with country code)</Label>
              <Input
                id="test-phone"
                type="tel"
                placeholder="+919876543210"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                disabled={testLoading === SERVICE_NAMES.WHATSAPP}
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +91 for India)
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setTestPhoneModalOpen(false); setTestPhoneNumber(""); }} 
              disabled={testLoading === SERVICE_NAMES.WHATSAPP}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleTestWhatsApp} 
              disabled={testLoading === SERVICE_NAMES.WHATSAPP || !testPhoneNumber.trim()}
              className="w-full sm:w-auto"
            >
              {testLoading === SERVICE_NAMES.WHATSAPP ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SettingsContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <SettingsSkeleton />
  }

  if (!user) {
    return null
  }

  const userRoles = user.roles || []
  const isSuperAdmin = userRoles.map((r: string) => r.toUpperCase()).includes(ROLES.SUPER_ADMIN)
  const canManageSettings = hasPermission(userRoles, PERMISSION.MANAGE_SETTINGS)

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title="Settings"
          description="Manage your account and preferences."
        />

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            {(isSuperAdmin || canManageSettings) && (
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                System
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>

          {(isSuperAdmin || canManageSettings) && (
            <TabsContent value="system">
              <SystemSettings />
            </TabsContent>
          )}
        </Tabs>
      </PageContainer>
    </AppLayout>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  )
}
