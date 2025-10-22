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
  XCircle,
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
    isActive: false, // Service is connected and ready
    connectionStatus: 'DISABLED',
    isConnecting: false,
    isInitializing: false, // For QR code initialization
    qrCode: null as string | null,
    lastConnected: null as string | null,
    lastError: null as string | null,
    clientId: 'fundifyhub-admin-frontend'
  })
  
  // Email service state
  const [emailService, setEmailService] = useState({
    isActive: false, // Service is connected and ready
    connectionStatus: 'DISABLED',
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
  
  // Store abort controller for canceling fetch stream
  const [abortController, setAbortController] = useState<AbortController | null>(null)

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
  const disconnectWhatsApp = async () => {
    try {
      setWhatsappService(prev => ({ ...prev, isConnecting: true }))
      
      const response = await fetch(apiUrl(`${API_CONFIG.ENDPOINTS.ADMIN.SERVICES_CONFIG}/WHATSAPP`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: false,
          config: { clientId: whatsappService.clientId }
        })
      })
      
      const result = await response.json()
      if (result.success) {
        setWhatsappService(prev => ({ 
          ...prev, 
          isActive: false,
          isConnecting: false,
          connectionStatus: 'DISABLED',
          lastError: null,
          qrCode: null
        }))
        
        // Cancel any ongoing stream
        if (abortController) {
          abortController.abort()
          setAbortController(null)
        }
        
        toast({
          title: "Success",
          description: "WhatsApp service disconnected successfully!",
        })
      } else {
        setWhatsappService(prev => ({ 
          ...prev, 
          isConnecting: false,
          lastError: result.message || 'Failed to disconnect service'
        }))
        toast({
          title: "Error",
          description: `Failed to disconnect: ${result.message}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      setWhatsappService(prev => ({ 
        ...prev, 
        isConnecting: false,
        lastError: `Error disconnecting: ${(error as Error).message}`
      }))
      toast({
        title: "Error",
        description: `Error disconnecting: ${(error as Error).message}`,
        variant: "destructive"
      })
    }
  }

  const initializeWhatsApp = async () => {
    try {
      setWhatsappService(prev => ({ ...prev, isInitializing: true, qrCode: null, lastError: null }))
      
      // First, enable the service in backend
      const configResponse = await fetch(apiUrl(`${API_CONFIG.ENDPOINTS.ADMIN.SERVICES_CONFIG}/WHATSAPP`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: true,
          config: { clientId: whatsappService.clientId }
        })
      })
      
      const configResult = await configResponse.json()
      if (!configResult.success) {
        throw new Error(configResult.message || 'Failed to enable WhatsApp service')
      }
      
      // Cancel existing connection if any
      if (abortController) {
        abortController.abort()
      }
      
      // Create new abort controller
      const controller = new AbortController()
      setAbortController(controller)
      
      // Use fetch with streaming instead of EventSource for better credential support
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.WHATSAPP_QR), {
        credentials: 'include', // Send cookies
        headers: {
          'Accept': 'text/event-stream',
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to connect: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      // Read stream
      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  handleWhatsAppEvent(data);
                } catch (error) {
                  console.error('Error parsing SSE data:', error);
                }
              }
            }
          }
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.error('Stream reading error:', error);
            setWhatsappService(prev => ({ 
              ...prev, 
              isConnecting: false,
              isInitializing: false, 
              connectionStatus: 'ERROR',
              lastError: `Connection error: ${(error as Error).message}`
            }));
          }
        }
      };

      readStream();
      
      toast({
        title: "Initializing",
        description: "Starting WhatsApp connection...",
      })
      
    } catch (error) {
      setWhatsappService(prev => ({ ...prev, isInitializing: false, lastError: (error as Error).message }))
      toast({
        title: "Error",
        description: `Error initializing WhatsApp: ${(error as Error).message}`,
        variant: "destructive"
      })
    }
  }

  const handleWhatsAppEvent = (event: any) => {
    console.log('📨 WhatsApp Event Received:', event); // Debug log
    
    switch (event.type) {
      case 'INITIALIZING':
        setWhatsappService(prev => ({
          ...prev,
          connectionStatus: 'INITIALIZING',
          isInitializing: true,
          isConnecting: true,
          lastError: null
        }))
        toast({
          title: "Initializing",
          description: event.data?.message || "Starting WhatsApp initialization...",
        })
        break

      case 'QR_CODE':
      case 'WAITING_FOR_QR_SCAN':
        setWhatsappService(prev => ({
          ...prev,
          qrCode: event.data?.qrCode || event.qrCode,
          connectionStatus: 'QR_READY',
          isInitializing: false,
          isConnecting: true,
          lastError: null
        }))
        toast({
          title: "QR Code Ready",
          description: "Scan the QR code with WhatsApp on your phone",
        })
        break
        
      case 'AUTHENTICATED':
        setWhatsappService(prev => ({
          ...prev,
          connectionStatus: 'AUTHENTICATED',
          isConnecting: true,
          lastError: null
        }))
        toast({
          title: "Authenticated",
          description: "WhatsApp authenticated successfully!",
        })
        break
        
      case 'READY':
      case 'CONNECTED':
        setWhatsappService(prev => ({
          ...prev,
          isActive: true, // Service is now active!
          connectionStatus: 'CONNECTED',
          isInitializing: false,
          isConnecting: false,
          qrCode: null,
          lastConnected: new Date().toISOString(),
          lastError: null
        }))
        if (abortController) {
          abortController.abort()
          setAbortController(null)
        }
        toast({
          title: "Connected",
          description: "WhatsApp is ready for OTP sending!",
        })
        break
        
      case 'DISCONNECTED':
        setWhatsappService(prev => ({
          ...prev,
          isActive: false,
          connectionStatus: 'DISCONNECTED',
          isConnecting: false,
          qrCode: null,
          lastError: event.data?.message
        }))
        if (abortController) {
          abortController.abort()
          setAbortController(null)
        }
        toast({
          title: "Disconnected",
          description: event.data?.message || "WhatsApp disconnected",
          variant: "destructive"
        })
        break

      case 'AUTH_FAILURE':
        setWhatsappService(prev => ({
          ...prev,
          isActive: false,
          connectionStatus: 'AUTH_FAILURE',
          isInitializing: false,
          isConnecting: false,
          qrCode: null,
          lastError: event.data?.message || 'Authentication failed'
        }))
        if (abortController) {
          abortController.abort()
          setAbortController(null)
        }
        toast({
          title: "Authentication Failed",
          description: event.data?.message || "WhatsApp authentication failed",
          variant: "destructive"
        })
        break

      case 'DISABLED':
        setWhatsappService(prev => ({
          ...prev,
          isActive: false,
          connectionStatus: 'DISABLED',
          isInitializing: false,
          isConnecting: false,
          qrCode: null
        }))
        break

      case 'TIMEOUT':
        setWhatsappService(prev => ({
          ...prev,
          isActive: false,
          connectionStatus: 'TIMEOUT',
          isInitializing: false,
          isConnecting: false,
          qrCode: null,
          lastError: event.data?.message || 'QR code scan timeout'
        }))
        if (abortController) {
          abortController.abort()
          setAbortController(null)
        }
        toast({
          title: "Connection Timeout",
          description: event.data?.message || "QR code was not scanned in time. Please try again.",
          variant: "destructive"
        })
        break

      case 'STATUS':
        // Initial status update
        if (event.data?.connectionStatus) {
          setWhatsappService(prev => ({
            ...prev,
            connectionStatus: event.data.connectionStatus,
            isActive: event.data.isActive || false,
            isEnabled: event.data.isEnabled || false
          }))
        }
        break
        
      default:
        console.log('Unknown WhatsApp event type:', event.type)
    }
  }

  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.WHATSAPP_STATUS), {
        credentials: 'include' // Include cookies for authentication
      })
      const result = await response.json()
      
      if (result.success) {
        const status = result.data
        setWhatsappService(prev => ({
          ...prev,
          isActive: status.isActive || false, // Set isActive from backend
          connectionStatus: status.connectionStatus || 'DISABLED',
          lastConnected: status.lastConnectedAt || status.lastConnected,
          lastError: status.lastError || null,
          qrCode: null // Clear any QR code when checking status
        }))
      } else {
        setWhatsappService(prev => ({
          ...prev,
          isActive: false,
          connectionStatus: 'DISABLED',
          lastError: result.error || 'Failed to check WhatsApp status'
        }))
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error)
      setWhatsappService(prev => ({
        ...prev,
        isActive: false,
        connectionStatus: 'DISABLED',
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
        credentials: 'include', // Include cookies for authentication
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

  const testEmailConnection = async () => {
    try {
      setEmailService(prev => ({ ...prev, isConnecting: true, lastError: null }))
      
      // Validate configuration first
      if (!emailService.config.smtpHost || !emailService.config.smtpUser || !emailService.config.smtpPass) {
        setEmailService(prev => ({ ...prev, isConnecting: false }))
        toast({
          title: "Configuration Required",
          description: "Please fill in all SMTP settings (Host, Email, Password).",
          variant: "destructive"
        })
        return
      }

      // Send test connection request
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.EMAIL_TEST_CONNECT), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            smtpHost: emailService.config.smtpHost,
            smtpPort: emailService.config.smtpPort || 587,
            smtpSecure: false,
            smtpUser: emailService.config.smtpUser,
            smtpPass: emailService.config.smtpPass,
            smtpFrom: emailService.config.smtpFrom || emailService.config.smtpUser
          }
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setEmailService(prev => ({ 
          ...prev, 
          isActive: true,
          isConnecting: false,
          connectionStatus: 'CONNECTED',
          lastError: null
        }))
        toast({
          title: "Success!",
          description: result.message || "Email service connected successfully and test email sent!",
        })
      } else {
        setEmailService(prev => ({ 
          ...prev, 
          isActive: false,
          isConnecting: false,
          connectionStatus: 'AUTH_FAILURE',
          lastError: result.message || 'Failed to connect'
        }))
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: result.message || "Failed to connect to Email service. Please check your SMTP credentials."
        })
      }

    } catch (error) {
      console.error('Failed to test Email connection:', error)
      setEmailService(prev => ({ 
        ...prev, 
        isActive: false,
        isConnecting: false,
        connectionStatus: 'AUTH_FAILURE',
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }))
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect to Email service"
      })
    }
  }

  const disconnectEmail = async () => {
    try {
      setEmailService(prev => ({ ...prev, isConnecting: true }))
      
      const response = await fetch(apiUrl(`${API_CONFIG.ENDPOINTS.ADMIN.SERVICES_CONFIG}/EMAIL`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: false,
          config: emailService.config
        })
      })
      
      const result = await response.json()
      if (result.success) {
        setEmailService(prev => ({ 
          ...prev, 
          isActive: false,
          isConnecting: false,
          connectionStatus: 'DISABLED',
          lastError: null
        }))
        toast({
          title: "Success",
          description: "Email service disconnected successfully!",
        })
      } else {
        setEmailService(prev => ({ ...prev, isConnecting: false }))
        toast({
          title: "Error",
          description: `Failed to disconnect: ${result.message}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      setEmailService(prev => ({ ...prev, isConnecting: false }))
      toast({
        title: "Error",
        description: `Error disconnecting: ${(error as Error).message}`,
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
        credentials: 'include',
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
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.EMAIL_STATUS), {
        credentials: 'include' // Include cookies for authentication
      })
      const result = await response.json()
      
      if (result.success) {
        const status = result.data
        setEmailService(prev => ({
          ...prev,
          isActive: status.isActive || false,
          connectionStatus: status.connectionStatus === 'connected' ? 'CONNECTED' : 'DISABLED',
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
      setEmailService(prev => ({
        ...prev,
        isActive: false,
        connectionStatus: 'DISABLED'
      }))
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
      if (abortController) {
        abortController.abort()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Settings className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">System Settings</h1>
            <p className="text-muted-foreground mt-1">Configure platform settings and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/50">
            <TabsTrigger value="general" className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Globe className="w-4 h-4 mr-2 hidden sm:inline" />
              General
            </TabsTrigger>
            <TabsTrigger value="loans" className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <DollarSign className="w-4 h-4 mr-2 hidden sm:inline" />
              Loans
            </TabsTrigger>
            <TabsTrigger value="services" className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <MessageSquare className="w-4 h-4 mr-2 hidden sm:inline" />
              Services
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Bell className="w-4 h-4 mr-2 hidden sm:inline" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Shield className="w-4 h-4 mr-2 hidden sm:inline" />
              Security
            </TabsTrigger>
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
              <Card className="border-2">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <span>WhatsApp OTP Service</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Service Status */}
                  <div className="flex items-center justify-between p-4 border-2 rounded-xl bg-card">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        whatsappService.isActive ? 'bg-green-500 shadow-lg shadow-green-500/50' :
                        whatsappService.connectionStatus === 'QR_READY' ? 'bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/50' :
                        whatsappService.isInitializing || whatsappService.isConnecting ? 'bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50' :
                        'bg-gray-400 dark:bg-gray-600'
                      }`} />
                      <div>
                        <p className="font-semibold text-base">Service Status</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {whatsappService.isActive ? 'Connected & Active' :
                           whatsappService.connectionStatus === 'QR_READY' ? 'Scan QR Code to Connect' :
                           whatsappService.isInitializing ? 'Initializing...' :
                           whatsappService.isConnecting ? 'Connecting...' :
                           'Not Configured'}
                        </p>
                        {whatsappService.lastConnected && whatsappService.isActive && (
                          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Connected: {new Date(whatsappService.lastConnected).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {whatsappService.isActive ? (
                        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 px-3 py-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
                          Active
                        </Badge>
                      ) : whatsappService.isInitializing || whatsappService.isConnecting ? (
                        <Badge variant="outline" className="border-blue-500/20 text-blue-700 dark:text-blue-400 px-3 py-1">
                          <RefreshCw className="w-3 h-3 animate-spin mr-1.5" />
                          Connecting
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground px-3 py-1">Inactive</Badge>
                      )}
                    </div>
                  </div>

                  {/* Error Message */}
                  {whatsappService.lastError && (
                    <div className="rounded-lg bg-destructive/10 dark:bg-destructive/20 p-4 border border-destructive/20">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive dark:text-red-400">{whatsappService.lastError}</p>
                      </div>
                    </div>
                  )}

                  {/* Service Controls - No toggle, direct action buttons */}
                  <div className="space-y-4">
                    {!whatsappService.isActive ? (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-start gap-3 p-3 bg-muted/50 dark:bg-muted/30 rounded-lg border">
                          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground">
                            Connect WhatsApp to enable OTP sending via WhatsApp messages.
                          </p>
                        </div>
                        <Button
                          onClick={initializeWhatsApp}
                          disabled={whatsappService.isInitializing || whatsappService.isConnecting}
                          className="flex items-center justify-center gap-2 w-full sm:w-auto"
                          size="default"
                        >
                          {whatsappService.isInitializing || whatsappService.isConnecting ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              {whatsappService.isInitializing ? 'Initializing...' : 'Connecting...'}
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-4 h-4" />
                              Connect WhatsApp
                            </>
                          )}
                        </Button>

                        {/* QR Code Display */}
                        {whatsappService.qrCode && (
                          <div className="relative p-8 border-2 border-dashed border-green-500/30 dark:border-green-500/50 rounded-xl text-center space-y-6 bg-gradient-to-br from-green-500/5 via-transparent to-green-500/5 dark:from-green-500/10 dark:via-transparent dark:to-green-500/10">
                            {/* Decorative corner badges */}
                            <div className="absolute top-3 right-3">
                              <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-xs text-green-700 dark:text-green-400 font-medium">
                                Expires in 3 min
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                              <div className="p-2 bg-green-500/10 rounded-lg">
                                <QrCode className="w-6 h-6" />
                              </div>
                              <div className="text-left">
                                <p className="font-bold text-lg">Scan QR Code</p>
                                <p className="text-xs text-muted-foreground">Use WhatsApp on your phone</p>
                              </div>
                            </div>
                            
                            <div className="relative inline-block">
                              <div className="absolute inset-0 bg-green-500/20 dark:bg-green-500/30 blur-xl rounded-lg"></div>
                              <img 
                                src={whatsappService.qrCode} 
                                alt="WhatsApp QR Code" 
                                className="relative mx-auto w-64 h-64 border-4 border-green-500/20 dark:border-green-500/40 rounded-2xl shadow-2xl bg-white p-4"
                              />
                            </div>
                            
                            <div className="max-w-sm mx-auto">
                              <div className="p-4 bg-muted/50 dark:bg-muted/30 rounded-lg border">
                                <p className="font-semibold text-foreground flex items-center gap-2 mb-3">
                                  <Smartphone className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  Quick Setup Guide
                                </p>
                                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground text-left">
                                  <li className="flex items-start gap-2">
                                    <span className="shrink-0 w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center text-xs font-bold text-green-600 dark:text-green-400">1</span>
                                    <span>Open WhatsApp on your phone</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="shrink-0 w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center text-xs font-bold text-green-600 dark:text-green-400">2</span>
                                    <span>Tap Menu or Settings → Linked Devices</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="shrink-0 w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center text-xs font-bold text-green-600 dark:text-green-400">3</span>
                                    <span>Tap "Link a Device" and scan this QR code</span>
                                  </li>
                                </ol>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-3 p-4 bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                            WhatsApp is connected and ready to send OTPs!
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            variant="outline"
                            onClick={checkWhatsAppStatus}
                            className="flex items-center justify-center gap-2"
                            size="default"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Check Status
                          </Button>
                          
                          <Button
                            variant="destructive"
                            onClick={disconnectWhatsApp}
                            disabled={whatsappService.isConnecting}
                            className="flex items-center justify-center gap-2"
                            size="default"
                          >
                            {whatsappService.isConnecting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Email OTP Service */}
              <Card className="border-2">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Email OTP Service</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Service Status */}
                  <div className="flex items-center justify-between p-4 border-2 rounded-xl bg-card">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        emailService.isActive ? 'bg-green-500 shadow-lg shadow-green-500/50' :
                        emailService.isConnecting ? 'bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50' :
                        'bg-gray-400 dark:bg-gray-600'
                      }`} />
                      <div>
                        <p className="font-semibold text-base">Service Status</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {emailService.isActive ? 'Connected & Active' :
                           emailService.isConnecting ? 'Testing Configuration...' :
                           'Not Configured'}
                        </p>
                        {emailService.lastConnected && emailService.isActive && (
                          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Connected: {new Date(emailService.lastConnected).toLocaleString()}
                          </p>
                        )}
                        {emailService.lastError && !emailService.isActive && (
                          <p className="text-xs text-destructive dark:text-red-400 mt-1.5 max-w-md flex items-start gap-1">
                            <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{emailService.lastError}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {emailService.isActive ? (
                        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 px-3 py-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
                          Active
                        </Badge>
                      ) : emailService.isConnecting ? (
                        <Badge variant="outline" className="border-blue-500/20 text-blue-700 dark:text-blue-400 px-3 py-1">
                          <RefreshCw className="w-3 h-3 animate-spin mr-1.5" />
                          Testing
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground px-3 py-1">Inactive</Badge>
                      )}
                    </div>
                  </div>

                  {/* Email Configuration Form */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm text-foreground uppercase tracking-wide">SMTP Configuration</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input
                          id="smtpHost"
                          placeholder="smtp.gmail.com"
                          value={emailService.config.smtpHost}
                          onChange={(e) => updateEmailConfig('smtpHost', e.target.value)}
                          disabled={emailService.isActive || emailService.isConnecting}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpPort">SMTP Port</Label>
                        <Input
                          id="smtpPort"
                          type="number"
                          placeholder="587"
                          value={emailService.config.smtpPort}
                          onChange={(e) => updateEmailConfig('smtpPort', parseInt(e.target.value))}
                          disabled={emailService.isActive || emailService.isConnecting}
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpUser">Email Address</Label>
                        <Input
                          id="smtpUser"
                          type="email"
                          placeholder="your-email@gmail.com"
                          value={emailService.config.smtpUser}
                          onChange={(e) => updateEmailConfig('smtpUser', e.target.value)}
                          disabled={emailService.isActive || emailService.isConnecting}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpPass">Password / App Password</Label>
                        <Input
                          id="smtpPass"
                          type="password"
                          placeholder="••••••••••••••••"
                          value={emailService.config.smtpPass}
                          onChange={(e) => updateEmailConfig('smtpPass', e.target.value)}
                          disabled={emailService.isActive || emailService.isConnecting}
                          className="mt-1.5"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          For Gmail, use App Password instead of regular password
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="smtpFrom">From Address (Optional)</Label>
                      <Input
                        id="smtpFrom"
                        type="email"
                        placeholder="noreply@fundifyhub.com"
                        value={emailService.config.smtpFrom}
                        onChange={(e) => updateEmailConfig('smtpFrom', e.target.value)}
                        disabled={emailService.isActive || emailService.isConnecting}
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        If left empty, your email address will be used
                      </p>
                    </div>

                    {/* Help Box for Gmail Users */}
                    {emailService.config.smtpHost.includes('gmail') && !emailService.isActive && (
                      <div className="p-4 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div className="space-y-2 text-sm">
                            <p className="font-semibold text-blue-700 dark:text-blue-300">Using Gmail?</p>
                            <p className="text-blue-600 dark:text-blue-400">
                              You need to use an App Password instead of your regular Gmail password.
                            </p>
                            <a 
                              href="https://myaccount.google.com/apppasswords" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                              Generate App Password →
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                      {!emailService.isActive ? (
                        <Button
                          onClick={testEmailConnection}
                          disabled={emailService.isConnecting}
                          className="flex items-center justify-center gap-2 w-full sm:w-auto"
                          size="default"
                        >
                          {emailService.isConnecting ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Testing Connection...
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              Test & Connect
                            </>
                          )}
                        </Button>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 p-4 bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 rounded-lg flex-1">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                              Email service is connected and ready to send OTPs!
                            </p>
                          </div>
                          
                          <Button
                            variant="outline"
                            onClick={checkEmailStatus}
                            className="flex items-center justify-center gap-2"
                            size="default"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Check Status
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={testEmailConfiguration}
                            disabled={emailService.isTesting}
                            className="flex items-center justify-center gap-2"
                            size="default"
                          >
                            {emailService.isTesting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                            Test
                          </Button>
                          
                          <Button
                            variant="destructive"
                            onClick={disconnectEmail}
                            disabled={emailService.isConnecting}
                            className="flex items-center justify-center gap-2"
                            size="default"
                          >
                            {emailService.isConnecting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                            Disconnect
                          </Button>
                        </>
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