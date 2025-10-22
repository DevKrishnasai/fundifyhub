"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label" 
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Settings,
  Save,
  Bell,
  Shield,
  DollarSign,
  Users,
  Globe,
  Database,
  Mail,
  Smartphone,
  MessageSquare,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  QrCode,
  Power,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { apiUrl, API_CONFIG } from "@/lib/utils"

export default function AdminSettingsPage() {
  const { toast } = useToast()
  
  const [generalSettings, setGeneralSettings] = useState({
    platformName: "AssetLend",
    platformDescription: "Digital asset-backed lending platform",
    supportEmail: "support@assetlend.com",
    supportPhone: "+91 80000 12345",
    businessHours: "9:00 AM - 6:00 PM",
    timezone: "Asia/Kolkata",
  })

  // WhatsApp service state
  const [whatsappService, setWhatsappService] = useState({
    isEnabled: false,
    connectionStatus: 'disabled',
    isConnecting: false,
    isInitializing: false, // For QR code initialization
    qrCode: null as string | null,
    lastConnected: null as string | null,
    lastError: null as string | null,
    clientId: 'fundifyhub-admin-frontend'
  })
  
  // Email service state
  const [emailService, setEmailService] = useState({
    isEnabled: false,
    connectionStatus: 'disabled',
    isActive: false,
    isConnecting: false,
    isTesting: false,
    lastConnected: null as string | null,
    lastError: null as string | null,
    config: {
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: '',
      smtpPass: '',
      smtpFrom: 'noreply@fundifyhub.com'
    }
  })
  
  // Real-time event source for WhatsApp QR updates
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  const [loanSettings, setLoanSettings] = useState({
    minLoanAmount: 5000,
    maxLoanAmount: 500000,
    defaultInterestRate: 12,
    minInterestRate: 8,
    maxInterestRate: 24,
    maxTenureMonths: 12,
    processingFeePercent: 2,
    platformFeePercent: 1,
    autoApprovalLimit: 25000,
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    reminderDays: 3,
    overdueNotifications: true,
    paymentConfirmations: true,
    systemAlerts: true,
  })

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorRequired: false,
    sessionTimeout: 30,
    passwordComplexity: true,
    loginAttempts: 3,
    accountLockoutMinutes: 15,
    dataEncryption: true,
  })

  const handleSaveGeneral = () => {
    // Save general settings logic
    toast({
      title: "Success",
      description: "General settings saved successfully!",
    })
  }

  const handleSaveLoans = () => {
    // Save loan settings logic  
    toast({
      title: "Success", 
      description: "Loan settings saved successfully!",
    })
  }

  const handleSaveNotifications = () => {
    // Save notification settings logic
    toast({
      title: "Success",
      description: "Notification settings saved successfully!",
    })
  }

  const handleSaveSecurity = () => {
    // Save security settings logic
    toast({
      title: "Success",
      description: "Security settings saved successfully!",
    })
  }

  // WhatsApp service handlers
  const toggleWhatsAppService = async (enabled: boolean) => {
    try {
      setWhatsappService(prev => ({ ...prev, isConnecting: true }))
      
      const response = await fetch(apiUrl(`${API_CONFIG.ENDPOINTS.ADMIN.SERVICES_CONFIG}/WHATSAPP`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: enabled,
          config: { clientId: whatsappService.clientId }
        })
      })
      
      const result = await response.json()
      if (result.success) {
        setWhatsappService(prev => ({ 
          ...prev, 
          isEnabled: enabled,
          isConnecting: false,
          connectionStatus: enabled ? prev.connectionStatus : 'DISABLED',
          lastError: null
        }))
        await checkWhatsAppStatus() // Refresh status
        toast({
          title: "Success",
          description: `WhatsApp service ${enabled ? 'enabled' : 'disabled'} successfully!`,
        })
      } else {
        setWhatsappService(prev => ({ 
          ...prev, 
          isConnecting: false,
          lastError: result.message || 'Failed to update service configuration'
        }))
        toast({
          title: "Error",
          description: `Failed to ${enabled ? 'enable' : 'disable'} service: ${result.message}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      setWhatsappService(prev => ({ 
        ...prev, 
        isConnecting: false,
        lastError: `Error ${enabled ? 'enabling' : 'disabling'} service: ${(error as Error).message}`
      }))
      toast({
        title: "Error",
        description: `Error ${enabled ? 'enabling' : 'disabling'} service: ${(error as Error).message}`,
        variant: "destructive"
      })
    }
  }

  const initializeWhatsApp = async () => {
    try {
      setWhatsappService(prev => ({ ...prev, isInitializing: true, qrCode: null }))
      
      // Close existing connection if any
      if (eventSource) {
        eventSource.close()
      }
      
      // Start SSE connection for real-time updates
      const newEventSource = new EventSource(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.WHATSAPP_QR))
      setEventSource(newEventSource)
      
      newEventSource.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data)
          handleWhatsAppEvent(data)
        } catch (error) {
          console.error('Error parsing SSE data:', error)
        }
      }
      
      newEventSource.onerror = function(error) {
        console.error('SSE connection error:', error)
        setWhatsappService(prev => ({ 
          ...prev, 
          isConnecting: false, 
          connectionStatus: 'ERROR' 
        }))
      }
      
      toast({
        title: "Initializing",
        description: "Starting WhatsApp connection...",
      })
      
    } catch (error) {
      setWhatsappService(prev => ({ ...prev, isInitializing: false }))
      toast({
        title: "Error",
        description: `Error initializing WhatsApp: ${(error as Error).message}`,
        variant: "destructive"
      })
    }
  }

  const handleWhatsAppEvent = (event: any) => {
    switch (event.type) {
      case 'QR_CODE':
        setWhatsappService(prev => ({
          ...prev,
          qrCode: event.qrCode || event.data?.qrCode,
          connectionStatus: 'QR_READY',
          isInitializing: false
        }))
        break
        
      case 'AUTHENTICATED':
        setWhatsappService(prev => ({
          ...prev,
          connectionStatus: 'AUTHENTICATED'
        }))
        toast({
          title: "Authenticated",
          description: "WhatsApp authenticated successfully!",
        })
        break
        
      case 'READY':
        setWhatsappService(prev => ({
          ...prev,
          connectionStatus: 'connected',
          isInitializing: false,
          qrCode: null,
          lastConnected: new Date().toISOString()
        }))
        if (eventSource) {
          eventSource.close()
          setEventSource(null)
        }
        toast({
          title: "Connected",
          description: "WhatsApp is ready for OTP sending!",
        })
        break
        
      case 'DISCONNECTED':
        setWhatsappService(prev => ({
          ...prev,
          connectionStatus: 'disabled',
          isInitializing: false,
          qrCode: null
        }))
        break
        
      case 'AUTH_FAILURE':
        setWhatsappService(prev => ({
          ...prev,
          connectionStatus: 'ERROR',
          isInitializing: false,
          qrCode: null
        }))
        toast({
          title: "Authentication Failed",
          description: "WhatsApp authentication failed. Please try again.",
          variant: "destructive"
        })
        break
    }
  }

  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.WHATSAPP_STATUS))
      const result = await response.json()
      
      if (result.success) {
        const status = result.data
        setWhatsappService(prev => ({
          ...prev,
          isEnabled: status.isEnabled,
          connectionStatus: status.connectionStatus,
          lastConnected: status.lastConnected,
          lastError: null
        }))
      } else {
        setWhatsappService(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
          lastError: result.error || 'Failed to check WhatsApp status'
        }))
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error)
      setWhatsappService(prev => ({
        ...prev,
        connectionStatus: 'disconnected',
        lastError: 'Failed to connect to server'
      }))
    }
  }

  // Email service handlers
  const saveEmailConfiguration = async () => {
    try {
      // Validate required fields before sending
      if (!emailService.config.smtpHost || !emailService.config.smtpUser || !emailService.config.smtpPass) {
        toast({
          title: "Configuration Error",
          description: "Please fill in SMTP Host, Username, and Password fields.",
          variant: "destructive"
        })
        return
      }

      setEmailService(prev => ({ ...prev, isConnecting: true }))
      
      const response = await fetch(apiUrl(`${API_CONFIG.ENDPOINTS.ADMIN.SERVICES_CONFIG}/EMAIL`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: true,
          config: {
            smtpHost: emailService.config.smtpHost,
            smtpPort: emailService.config.smtpPort || 587,
            smtpSecure: false, // Auto-detect based on port in backend
            smtpUser: emailService.config.smtpUser,
            smtpPass: emailService.config.smtpPass,
            smtpFrom: emailService.config.smtpUser || 'noreply@fundifyhub.com' // Use user's email as from address
          }
        })
      })
      
      const result = await response.json()
      if (result.success) {
        setEmailService(prev => ({ ...prev, isEnabled: true, isConnecting: false }))
        await checkEmailStatus() // Refresh status after enabling
        toast({
          title: "Success",
          description: "Email service configured and enabled successfully!",
        })
      } else {
        setEmailService(prev => ({ ...prev, isConnecting: false }))
        toast({
          title: "Error",
          description: `Failed to save configuration: ${result.message}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      setEmailService(prev => ({ ...prev, isConnecting: false }))
      toast({
        title: "Error",
        description: `Error saving configuration: ${(error as Error).message}`,
        variant: "destructive"
      })
    }
  }

  const toggleEmailService = async (enabled: boolean) => {
    try {
      setEmailService(prev => ({ ...prev, isConnecting: true }))
      
      // If enabling, validate configuration first
      if (enabled && (!emailService.config.smtpHost || !emailService.config.smtpUser || !emailService.config.smtpPass)) {
        setEmailService(prev => ({ ...prev, isConnecting: false }))
        toast({
          title: "Configuration Required",
          description: "Please configure SMTP settings first before enabling the service.",
          variant: "destructive"
        })
        return
      }
      
      const response = await fetch(apiUrl(`${API_CONFIG.ENDPOINTS.ADMIN.SERVICES_CONFIG}/EMAIL`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: enabled,
          config: enabled ? {
            smtpHost: emailService.config.smtpHost,
            smtpPort: emailService.config.smtpPort || 587,
            smtpSecure: false, // Auto-detect based on port in backend
            smtpUser: emailService.config.smtpUser,
            smtpPass: emailService.config.smtpPass,
            smtpFrom: emailService.config.smtpUser || 'noreply@fundifyhub.com' // Use user's email as from address
          } : emailService.config // Keep existing config when disabling
        })
      })
      
      const result = await response.json()
      if (result.success) {
        setEmailService(prev => ({ 
          ...prev, 
          isEnabled: enabled, 
          isConnecting: false,
          connectionStatus: enabled ? prev.connectionStatus : 'DISABLED'
        }))
        await checkEmailStatus() // Refresh status
        toast({
          title: "Success",
          description: `Email service ${enabled ? 'enabled' : 'disabled'} successfully!`,
        })
      } else {
        setEmailService(prev => ({ ...prev, isConnecting: false }))
        toast({
          title: "Error",
          description: `Failed to ${enabled ? 'enable' : 'disable'} service: ${result.message}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      setEmailService(prev => ({ ...prev, isConnecting: false }))
      toast({
        title: "Error",
        description: `Error ${enabled ? 'enabling' : 'disabling'} service: ${(error as Error).message}`,
        variant: "destructive"
      })
    }
  }



  const testEmailConfiguration = async () => {
    try {
      const testEmail = prompt('Enter email address to send test email to:')
      if (!testEmail) return
      
      setEmailService(prev => ({ ...prev, isTesting: true }))
      
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.EMAIL_TEST), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      })
      
      const result = await response.json()
      if (result.success) {
        toast({
          title: "Test Email Sent",
          description: `Test email queued for ${testEmail}. Check your inbox!`,
        })
      } else {
        toast({
          title: "Test Failed",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Error testing email: ${(error as Error).message}`,
        variant: "destructive"
      })
    } finally {
      setEmailService(prev => ({ ...prev, isTesting: false }))
    }
  }

  const checkEmailStatus = async () => {
    try {
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.EMAIL_STATUS))
      const result = await response.json()
      
      if (result.success) {
        const status = result.data
        setEmailService(prev => ({
          ...prev,
          isEnabled: status.isEnabled,
          isActive: status.isActive,
          connectionStatus: status.connectionStatus,
          lastConnected: status.lastConnectedAt,
          lastError: status.lastError,
          config: {
            ...prev.config,
            ...status.config,
            // Preserve password field as it's not returned by API for security
            smtpPass: prev.config.smtpPass || ''
          }
        }))
      }
    } catch (error) {
      console.error('Error checking email status:', error)
    }
  }

  const updateEmailConfig = (field: string, value: any) => {
    setEmailService(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value
      }
    }))
  }

  // Initialize services status on mount
  React.useEffect(() => {
    checkWhatsAppStatus()
    checkEmailStatus()
    
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
            <p className="text-muted-foreground">Configure platform settings and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="text-xs sm:text-sm">General</TabsTrigger>
            <TabsTrigger value="loans" className="text-xs sm:text-sm">Loans</TabsTrigger>
            <TabsTrigger value="services" className="text-xs sm:text-sm">Services</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">Notifications</TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm">Security</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  General Platform Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="platformName">Platform Name</Label>
                    <Input
                      id="platformName"
                      value={generalSettings.platformName}
                      onChange={(e) => setGeneralSettings({...generalSettings, platformName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={generalSettings.timezone} 
                      onValueChange={(value) => setGeneralSettings({...generalSettings, timezone: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="platformDescription">Platform Description</Label>
                  <Textarea
                    id="platformDescription"
                    value={generalSettings.platformDescription}
                    onChange={(e) => setGeneralSettings({...generalSettings, platformDescription: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={generalSettings.supportEmail}
                      onChange={(e) => setGeneralSettings({...generalSettings, supportEmail: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supportPhone">Support Phone</Label>
                    <Input
                      id="supportPhone"
                      value={generalSettings.supportPhone}
                      onChange={(e) => setGeneralSettings({...generalSettings, supportPhone: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="businessHours">Business Hours</Label>
                  <Input
                    id="businessHours"
                    value={generalSettings.businessHours}
                    onChange={(e) => setGeneralSettings({...generalSettings, businessHours: e.target.value})}
                  />
                </div>

                <Button onClick={handleSaveGeneral} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save General Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loan Settings */}
          <TabsContent value="loans">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Loan Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minLoanAmount">Minimum Loan Amount (₹)</Label>
                    <Input
                      id="minLoanAmount"
                      type="number"
                      value={loanSettings.minLoanAmount}
                      onChange={(e) => setLoanSettings({...loanSettings, minLoanAmount: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxLoanAmount">Maximum Loan Amount (₹)</Label>
                    <Input
                      id="maxLoanAmount"
                      type="number"
                      value={loanSettings.maxLoanAmount}
                      onChange={(e) => setLoanSettings({...loanSettings, maxLoanAmount: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="defaultInterestRate">Default Interest Rate (%)</Label>
                    <Input
                      id="defaultInterestRate"
                      type="number"
                      step="0.1"
                      value={loanSettings.defaultInterestRate}
                      onChange={(e) => setLoanSettings({...loanSettings, defaultInterestRate: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="minInterestRate">Min Interest Rate (%)</Label>
                    <Input
                      id="minInterestRate"
                      type="number"
                      step="0.1"
                      value={loanSettings.minInterestRate}
                      onChange={(e) => setLoanSettings({...loanSettings, minInterestRate: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxInterestRate">Max Interest Rate (%)</Label>
                    <Input
                      id="maxInterestRate"
                      type="number"
                      step="0.1"
                      value={loanSettings.maxInterestRate}
                      onChange={(e) => setLoanSettings({...loanSettings, maxInterestRate: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="maxTenureMonths">Max Tenure (Months)</Label>
                    <Input
                      id="maxTenureMonths"
                      type="number"
                      value={loanSettings.maxTenureMonths}
                      onChange={(e) => setLoanSettings({...loanSettings, maxTenureMonths: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="processingFeePercent">Processing Fee (%)</Label>
                    <Input
                      id="processingFeePercent"
                      type="number"
                      step="0.1"
                      value={loanSettings.processingFeePercent}
                      onChange={(e) => setLoanSettings({...loanSettings, processingFeePercent: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="platformFeePercent">Platform Fee (%)</Label>
                    <Input
                      id="platformFeePercent"
                      type="number"
                      step="0.1"
                      value={loanSettings.platformFeePercent}
                      onChange={(e) => setLoanSettings({...loanSettings, platformFeePercent: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="autoApprovalLimit">Auto-Approval Limit (₹)</Label>
                  <Input
                    id="autoApprovalLimit"
                    type="number"
                    value={loanSettings.autoApprovalLimit}
                    onChange={(e) => setLoanSettings({...loanSettings, autoApprovalLimit: parseInt(e.target.value)})}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Loans below this amount will be auto-approved if criteria are met
                  </p>
                </div>

                <Button onClick={handleSaveLoans} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save Loan Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Settings */}
          <TabsContent value="services">
            <div className="space-y-6">
              {/* WhatsApp OTP Service */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    WhatsApp OTP Service
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Service Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        whatsappService.connectionStatus === 'connected' ? 'bg-green-500' :
                        whatsappService.connectionStatus === 'QR_READY' ? 'bg-yellow-500' :
                        whatsappService.isInitializing ? 'bg-blue-500' :
                        'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium">Service Status</p>
                        <p className="text-sm text-muted-foreground">
                          {whatsappService.connectionStatus === 'connected' ? 'Connected' :
                           whatsappService.connectionStatus === 'QR_READY' ? 'Scan QR Code to Connect' :
                           whatsappService.isInitializing ? 'Connecting...' :
                           'Disabled'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {whatsappService.connectionStatus === 'connected' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : whatsappService.isInitializing ? (
                        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>

                  {/* Error Message */}
                  {whatsappService.lastError && (
                    <div className="rounded-md bg-red-50 p-3 border border-red-200">
                      <p className="text-sm text-red-700">{whatsappService.lastError}</p>
                    </div>
                  )}

                  {/* Service Controls */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Enable WhatsApp Service</p>
                        <p className="text-sm text-muted-foreground">
                          Toggle to enable/disable WhatsApp service for job workers
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {whatsappService.isConnecting && (
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        )}
                        <Switch 
                          checked={whatsappService.isEnabled}
                          onCheckedChange={toggleWhatsAppService}
                          disabled={whatsappService.isConnecting}
                        />
                      </div>
                    </div>

                    {whatsappService.isEnabled && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            onClick={initializeWhatsApp}
                            disabled={whatsappService.isInitializing || whatsappService.connectionStatus === 'connected'}
                            className="flex items-center gap-2"
                          >
                            {whatsappService.isInitializing ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                            {whatsappService.connectionStatus === 'connected' ? 'Connected' : 'Connect WhatsApp'}
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={checkWhatsAppStatus}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Check Status
                          </Button>
                        </div>

                        {/* Connection Progress */}
                        {whatsappService.isConnecting && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Connecting to WhatsApp...</span>
                              <span>Please wait</span>
                            </div>
                            <Progress value={33} className="h-2" />
                          </div>
                        )}

                        {/* QR Code Display */}
                        {whatsappService.qrCode && (
                          <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center space-y-4">
                            <div className="flex items-center justify-center gap-2 text-green-600">
                              <QrCode className="w-5 h-5" />
                              <span className="font-medium">Scan QR Code with WhatsApp</span>
                            </div>
                            <img 
                              src={whatsappService.qrCode} 
                              alt="WhatsApp QR Code" 
                              className="mx-auto max-w-xs border rounded-lg shadow-sm"
                            />
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>1. Open WhatsApp on your phone</p>
                              <p>2. Go to Settings → Linked Devices</p>
                              <p>3. Tap "Link a Device" and scan this QR code</p>
                            </div>
                          </div>
                        )}

                        {/* Connection Info */}
                        {whatsappService.lastConnected && (
                          <div className="text-sm text-muted-foreground">
                            Last connected: {new Date(whatsappService.lastConnected).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Email OTP Service */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Email OTP Service
                    {emailService.isActive && (
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    )}
                    {emailService.isEnabled && !emailService.isActive && (
                      <Badge className="bg-yellow-100 text-yellow-800">Configured</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Service Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        emailService.connectionStatus === 'connected' ? 'bg-green-500' :
                        emailService.isConnecting ? 'bg-blue-500' :
                        'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium">Service Status</p>
                        <p className="text-sm text-muted-foreground">
                          {emailService.connectionStatus === 'connected' ? 'Connected' :
                           emailService.isConnecting ? 'Testing Configuration...' :
                           'Disabled'}
                        </p>
                        {emailService.lastError && emailService.connectionStatus !== 'connected' && (
                          <p className="text-xs text-red-600 mt-1 max-w-md">
                            {emailService.lastError}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {emailService.connectionStatus === 'connected' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : emailService.isConnecting ? (
                        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>

                  {/* Service Controls */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Enable Email Service</p>
                        <p className="text-sm text-muted-foreground">
                          Toggle to enable/disable email service for job workers
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {emailService.isConnecting && (
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        )}
                        <Switch 
                          checked={emailService.isEnabled}
                          onCheckedChange={toggleEmailService}
                          disabled={emailService.isConnecting}
                        />
                      </div>
                    </div>

                    {/* Email Configuration */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Email Configuration</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="smtpHost">Host</Label>
                          <Input
                            id="smtpHost"
                            placeholder="smtp.gmail.com"
                            value={emailService.config.smtpHost}
                            onChange={(e) => updateEmailConfig('smtpHost', e.target.value)}
                            disabled={emailService.isConnecting}
                          />
                        </div>
                        <div>
                          <Label htmlFor="smtpPort">Port</Label>
                          <Input
                            id="smtpPort"
                            type="number"
                            placeholder="587"
                            value={emailService.config.smtpPort}
                            onChange={(e) => updateEmailConfig('smtpPort', parseInt(e.target.value))}
                            disabled={emailService.isConnecting}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="smtpUser">Email</Label>
                          <Input
                            id="smtpUser"
                            type="email"
                            placeholder="your-email@gmail.com"
                            value={emailService.config.smtpUser}
                            onChange={(e) => updateEmailConfig('smtpUser', e.target.value)}
                            disabled={emailService.isConnecting}
                          />
                        </div>
                        <div>
                          <Label htmlFor="smtpPass">Password</Label>
                            <Input
                              id="smtpPass"
                              type="password"
                              placeholder="your-app-password"
                              value={emailService.config.smtpPass}
                              onChange={(e) => updateEmailConfig('smtpPass', e.target.value)}
                              disabled={emailService.isConnecting}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                          <Button
                            onClick={saveEmailConfiguration}
                            disabled={emailService.isConnecting}
                            className="flex items-center gap-2"
                          >
                            {emailService.isConnecting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Save
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={testEmailConfiguration}
                            disabled={emailService.isConnecting || emailService.isTesting}
                            className="flex items-center gap-2"
                          >
                            {emailService.isTesting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                            Test Email
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={checkEmailStatus}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Check Status
                          </Button>
                        </div>

                        {/* Connection Status */}
                        {emailService.lastConnected && (
                          <div className="text-sm text-muted-foreground">
                            Last connected: {new Date(emailService.lastConnected).toLocaleString()}
                          </div>
                        )}
                      </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">Send notifications via email</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-sm text-muted-foreground">Send notifications via SMS</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, smsNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Push Notifications</p>
                        <p className="text-sm text-muted-foreground">Send push notifications to mobile app</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, pushNotifications: checked})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reminderDays">Payment Reminder (Days Before Due)</Label>
                  <Input
                    id="reminderDays"
                    type="number"
                    value={notificationSettings.reminderDays}
                    onChange={(e) => setNotificationSettings({...notificationSettings, reminderDays: parseInt(e.target.value)})}
                    className="w-24"
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Notification Types</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overdue Notifications</span>
                      <Switch 
                        checked={notificationSettings.overdueNotifications}
                        onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, overdueNotifications: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Payment Confirmations</span>
                      <Switch 
                        checked={notificationSettings.paymentConfirmations}
                        onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, paymentConfirmations: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">System Alerts</span>
                      <Switch 
                        checked={notificationSettings.systemAlerts}
                        onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, systemAlerts: checked})}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveNotifications} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security & Access Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                    </div>
                    <Switch 
                      checked={securitySettings.twoFactorRequired}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, twoFactorRequired: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Password Complexity</p>
                      <p className="text-sm text-muted-foreground">Enforce strong password requirements</p>
                    </div>
                    <Switch 
                      checked={securitySettings.passwordComplexity}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, passwordComplexity: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Data Encryption</p>
                      <p className="text-sm text-muted-foreground">Encrypt sensitive data at rest</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                      <Switch 
                        checked={securitySettings.dataEncryption}
                        onCheckedChange={(checked) => setSecuritySettings({...securitySettings, dataEncryption: checked})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (Minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="loginAttempts">Max Login Attempts</Label>
                    <Input
                      id="loginAttempts"
                      type="number"
                      value={securitySettings.loginAttempts}
                      onChange={(e) => setSecuritySettings({...securitySettings, loginAttempts: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountLockoutMinutes">Account Lockout (Minutes)</Label>
                    <Input
                      id="accountLockoutMinutes"
                      type="number"
                      value={securitySettings.accountLockoutMinutes}
                      onChange={(e) => setSecuritySettings({...securitySettings, accountLockoutMinutes: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveSecurity} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}