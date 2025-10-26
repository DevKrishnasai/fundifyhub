"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Mail,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  QrCode,
  RefreshCw,
  Save,
  Edit,
  Trash2,
  Clock,
  Server,
  Zap,
  Shield,
  Info,
  Settings,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiUrl, API_CONFIG } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

// Service status type
type ServiceStatus = {
  serviceName: string
  status: string
  isEnabled: boolean
  isActive: boolean
  connectionStatus: string
  lastConnectedAt?: string
  lastError?: string
  config?: any
  qrCode?: string
}

// Email configuration type
type EmailConfig = {
  host: string
  port: number
  user: string
  password: string
  from: string
}

export default function AdminSettingsPage() {
  const { toast } = useToast()
  
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})
  
  // Email Config State (inline editing)
  const [emailConfigMode, setEmailConfigMode] = useState(false)
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    host: "",
    port: 587,
    user: "",
    password: "",
    from: "",
  })

  // Load existing config into form when entering edit mode
  useEffect(() => {
    if (emailConfigMode) {
      const emailService = services.find(s => s.serviceName === 'EMAIL')
      if (emailService?.config && Object.keys(emailService.config).length > 0) {
        setEmailConfig(emailService.config)
      }
    }
  }, [emailConfigMode, services])

  // Load services from API
  const loadServices = async () => {
    try {
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.SERVICES), {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        setServices(data.data)
      }
    } catch (error: any) {
      console.error('Load services error:', error)
      toast({
        variant: "destructive",
        title: "❌ Failed to load services",
        description: error.message || 'An error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  // Polling effect - simple 5 second interval
  useEffect(() => {
    // Initial load
    loadServices()

    // Set up polling interval
    const pollInterval = setInterval(() => {
      loadServices()
    }, 5000) // Poll every 5 seconds

    // Cleanup on unmount
    return () => clearInterval(pollInterval)
  }, []) // Empty dependency array - run once on mount

  // Manual refresh
  const handleRefresh = async () => {
    setLoading(true)
    await loadServices()
  }

  // Enable service
  const handleEnable = async (serviceName: string) => {
    const service = services.find(s => s.serviceName === serviceName)
    
    // For email, check if config exists
    if (serviceName === 'EMAIL') {
      if (!service?.config || Object.keys(service.config).length === 0) {
        toast({
          variant: "destructive",
          title: "⚠️ Configuration Required",
          description: "Please configure email settings before enabling",
        })
        setEmailConfigMode(true)
        return
      }
    }

    setActionLoading({ ...actionLoading, [`${serviceName}-enable`]: true })
    
    try {
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.SERVICE_ENABLE(serviceName)), {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Service Enabled",
          description: `${serviceName} has been enabled`,
        })
        await loadServices()
      } else {
        throw new Error(data.message)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ Enable Failed",
        description: error.message || 'An error occurred',
      })
    } finally {
      setActionLoading({ ...actionLoading, [`${serviceName}-enable`]: false })
    }
  }

  // Disable service (deletes everything)
  const handleDisable = async (serviceName: string) => {
    if (!confirm(`Are you sure you want to disable ${serviceName}? This will delete all configuration and data.`)) {
      return
    }

    setActionLoading({ ...actionLoading, [`${serviceName}-disable`]: true })
    
    try {
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.SERVICE_DISABLE(serviceName)), {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Service Disabled",
          description: `${serviceName} has been disabled and deleted`,
        })
        setEmailConfigMode(false) // Reset email config mode
        await loadServices()
      } else {
        throw new Error(data.message)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ Disable Failed",
        description: error.message || 'An error occurred',
      })
    } finally {
      setActionLoading({ ...actionLoading, [`${serviceName}-disable`]: false })
    }
  }

  // Save email configuration
  const handleSaveEmailConfig = async () => {
    if (!emailConfig.host || !emailConfig.user || !emailConfig.password || !emailConfig.from) {
      toast({
        variant: "destructive",
        title: "⚠️ Validation Error",
        description: "Please fill in all required fields",
      })
      return
    }

    setActionLoading({ ...actionLoading, 'email-config': true })
    
    // Show testing toast
    toast({
      title: "🔄 Testing Configuration",
      description: "Connecting to SMTP server and sending test email...",
    })
    
    try {
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.SERVICE_CONFIGURE('email')), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Configuration Saved & Tested",
          description: "Test email sent successfully! Check your inbox to confirm.",
        })
        setEmailConfigMode(false)
        await loadServices()
      } else {
        throw new Error(data.message)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ Configuration Test Failed",
        description: error.message || 'Failed to connect to SMTP server. Please check your settings.',
      })
    } finally {
      setActionLoading({ ...actionLoading, 'email-config': false })
    }
  }

  // Get status badge with theme support
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONNECTED':
      case 'AUTHENTICATED':
        return (
          <Badge className="bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 hover:bg-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" /> 
            Connected
          </Badge>
        )
      case 'DISCONNECTED':
      case 'DISABLED':
        return (
          <Badge variant="secondary" className="bg-secondary/50">
            <XCircle className="w-3 h-3 mr-1" /> 
            Disconnected
          </Badge>
        )
      case 'INITIALIZING':
      case 'CONNECTING':
        return (
          <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> 
            Connecting
          </Badge>
        )
      case 'WAITING_FOR_QR_SCAN':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20">
            <QrCode className="w-3 h-3 mr-1" /> 
            Scan QR
          </Badge>
        )
      case 'ERROR':
      case 'TIMEOUT':
      case 'AUTH_FAILURE':
        return (
          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertCircle className="w-3 h-3 mr-1" /> 
            Error
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        )
    }
  }

  // Render WhatsApp card
  const renderWhatsAppCard = (service: ServiceStatus) => {
    const isConnected = service.isActive && service.connectionStatus === 'CONNECTED'
    const needsQR = service.isEnabled && service.connectionStatus === 'WAITING_FOR_QR_SCAN'
    const isConnecting = service.isEnabled && ['INITIALIZING', 'AUTHENTICATED'].includes(service.connectionStatus)

    return (
      <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="border-b bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500 rounded-lg shadow-sm">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">WhatsApp</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Automated OTP messaging
                </CardDescription>
              </div>
            </div>
            {getStatusBadge(service.connectionStatus)}
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-6 space-y-4">
          {/* Connected State */}
          {isConnected && (
            <div className="space-y-3">
              <Alert className="border-green-500/20 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-sm text-green-700 dark:text-green-300">
                  <strong>Connected!</strong> Ready to send OTP messages.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Active</span>
                </div>
                {service.lastConnectedAt && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <span className="text-sm text-muted-foreground">Connected At</span>
                    <span className="text-xs font-medium">
                      {new Date(service.lastConnectedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connecting State */}
          {isConnecting && !needsQR && (
            <div className="space-y-3">
              <Alert className="border-blue-500/20 bg-blue-50 dark:bg-blue-950/20">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
                  Initializing WhatsApp connection...
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* QR Code Display */}
          {needsQR && service.qrCode && (
            <div className="border-2 border-yellow-500/30 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950/20 space-y-3">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <QrCode className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Scan QR Code</h3>
              </div>
              
              <div className="bg-white p-3 rounded-lg border">
                <Image
                  src={service.qrCode}
                  alt="WhatsApp QR Code"
                  width={180}
                  height={180}
                  className="rounded-md mx-auto"
                />
              </div>
              
              <div className="space-y-1.5 text-xs text-yellow-700 dark:text-yellow-300">
                <p className="flex items-start gap-2">
                  <span className="font-semibold">1.</span>
                  <span>Open WhatsApp → Settings → Linked Devices</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-semibold">2.</span>
                  <span>Tap "Link a Device" and scan this code</span>
                </p>
                <p className="flex items-start gap-2">
                  <Clock className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="italic">QR expires in 3 minutes</span>
                </p>
              </div>
            </div>
          )}

          {/* Disabled State */}
          {!service.isEnabled && !needsQR && (
            <div className="space-y-3">
              <Alert className="border-muted">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Connect your WhatsApp account to enable automated OTP messaging.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-muted-foreground">Disconnected</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {service.lastError && !isConnected && !needsQR && (
            <Alert variant="destructive" className="bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{service.lastError}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="bg-muted/30 border-t p-4">
          {!service.isEnabled ? (
            <Button
              onClick={() => handleEnable('WHATSAPP')}
              disabled={actionLoading['WHATSAPP-enable']}
              className="w-full"
            >
              {actionLoading['WHATSAPP-enable'] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Connect WhatsApp
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => handleDisable('WHATSAPP')}
              disabled={actionLoading['WHATSAPP-disable']}
              variant="destructive"
              className="w-full"
            >
              {actionLoading['WHATSAPP-disable'] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Disconnect
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  // Render Email card
  const renderEmailCard = (service: ServiceStatus) => {
    const hasConfig = service.config && Object.keys(service.config).length > 0
    const isConnected = service.isActive && service.connectionStatus === 'CONNECTED'
    const showConfigForm = emailConfigMode

    return (
      <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="border-b bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500 rounded-lg shadow-sm">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Email</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  SMTP email notifications
                </CardDescription>
              </div>
            </div>
            {getStatusBadge(service.connectionStatus)}
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-6 space-y-4">
          {/* Connected State - NOT in config mode */}
          {isConnected && !showConfigForm && (
            <div className="space-y-3">
              <Alert className="border-blue-500/20 bg-blue-50 dark:bg-blue-950/20">
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Connected!</strong> Ready to send email notifications.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <span className="text-sm text-muted-foreground">SMTP Host</span>
                  <span className="text-xs font-medium truncate max-w-[180px]">{service.config?.host}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-xs font-medium truncate max-w-[180px]">{service.config?.user}</span>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Required - NOT connected, NOT in config mode */}
          {!hasConfig && !showConfigForm && (
            <div className="space-y-3">
              <Alert className="border-yellow-500/20 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-sm text-yellow-700 dark:text-yellow-300">
                  Configuration required before enabling this service.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-muted-foreground">Not Configured</span>
                </div>
              </div>
            </div>
          )}

          {/* Disabled with config - NOT in config mode */}
          {!service.isEnabled && hasConfig && !showConfigForm && (
            <div className="space-y-3">
              <Alert className="border-muted">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Enable email service to start sending notifications.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-muted-foreground">Disconnected</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <span className="text-sm text-muted-foreground">SMTP Host</span>
                  <span className="text-xs font-medium truncate max-w-[180px]">{service.config?.host}</span>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Form */}
          {showConfigForm && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Settings className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">SMTP Configuration</h3>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="host" className="text-xs font-medium">SMTP Host</Label>
                    <Input
                      id="host"
                      placeholder="smtp.gmail.com"
                      value={emailConfig.host}
                      onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="port" className="text-xs font-medium">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      placeholder="587"
                      value={emailConfig.port}
                      onChange={(e) => setEmailConfig({ ...emailConfig, port: parseInt(e.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="user" className="text-xs font-medium">Email Address</Label>
                  <Input
                    id="user"
                    type="email"
                    placeholder="your-email@gmail.com"
                    value={emailConfig.user}
                    onChange={(e) => setEmailConfig({ ...emailConfig, user: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium">Password / App Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={emailConfig.password}
                    onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="from" className="text-xs font-medium">From Email</Label>
                  <Input
                    id="from"
                    type="email"
                    placeholder="noreply@fundifyhub.com"
                    value={emailConfig.from}
                    onChange={(e) => setEmailConfig({ ...emailConfig, from: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                {emailConfig.host.toLowerCase().includes('gmail') && (
                  <Alert className="border-blue-500/20 bg-blue-50 dark:bg-blue-950/20">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Gmail:</strong> Use an App Password.{' '}
                      <a 
                        href="https://myaccount.google.com/apppasswords" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-600"
                      >
                        Generate here
                      </a>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {service.lastError && !isConnected && (
            <Alert variant="destructive" className="bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{service.lastError}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="bg-muted/30 border-t p-4 flex-col gap-2">
          {showConfigForm ? (
            <div className="flex gap-2 w-full">
              <Button
                onClick={handleSaveEmailConfig}
                disabled={actionLoading['email-config']}
                className="flex-1"
              >
                {actionLoading['email-config'] ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Test & Save
                  </>
                )}
              </Button>
              <Button
                onClick={() => setEmailConfigMode(false)}
                variant="outline"
                disabled={!hasConfig}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              {!service.isEnabled && hasConfig && (
                <Button
                  onClick={() => setEmailConfigMode(true)}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <Edit className="mr-2 h-3 w-3" />
                  Edit Config
                </Button>
              )}
              {!service.isEnabled ? (
                <Button
                  onClick={() => hasConfig ? handleEnable('EMAIL') : setEmailConfigMode(true)}
                  disabled={actionLoading['EMAIL-enable']}
                  className="w-full"
                >
                  {actionLoading['EMAIL-enable'] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      {hasConfig ? (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Enable Service
                        </>
                      ) : (
                        <>
                          <Settings className="mr-2 h-4 w-4" />
                          Configure Email
                        </>
                      )}
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => handleDisable('EMAIL')}
                  disabled={actionLoading['EMAIL-disable']}
                  variant="destructive"
                  className="w-full"
                >
                  {actionLoading['EMAIL-disable'] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Disconnect
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    )
  }

  if (loading && services.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground text-sm">Loading services...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Service Settings
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage communication services for automated messaging
              </p>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              disabled={loading}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {/* Info Banner */}
          <Alert className="border-blue-500/20 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
              Real-time monitoring enabled. Page auto-refreshes every 5 seconds.
            </AlertDescription>
          </Alert>
        </div>

        {/* Service Cards - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {services.map((service) => {
            if (service.serviceName === 'WHATSAPP') {
              return <div key={service.serviceName}>{renderWhatsAppCard(service)}</div>
            }
            if (service.serviceName === 'EMAIL') {
              return <div key={service.serviceName}>{renderEmailCard(service)}</div>
            }
            return null
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-6 border-t">
          <p className="text-xs text-center text-muted-foreground">
            Services are monitored in real-time. Configuration changes take effect immediately.
          </p>
        </div>
      </div>
    </div>
  )
}
