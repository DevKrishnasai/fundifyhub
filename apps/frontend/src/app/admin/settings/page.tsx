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
    return (
      <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">WhatsApp Business</CardTitle>
                <CardDescription className="text-sm mt-0.5">
                  Automated messaging and notifications
                </CardDescription>
              </div>
            </div>
            {getStatusBadge(service.connectionStatus)}
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Status Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Status</span>
              </div>
              <p className="text-sm sm:text-base font-semibold">
                {service.isEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>

            <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1.5">
                <Server className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Active</span>
              </div>
              <p className="text-sm sm:text-base font-semibold">
                {service.isActive ? 'Yes' : 'No'}
              </p>
            </div>

            {service.lastConnectedAt && (
              <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border col-span-2 sm:col-span-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Last Connected</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold">
                  {new Date(service.lastConnectedAt).toLocaleString('en-US', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Error Display */}
          {service.lastError && (
            <Alert variant="destructive" className="bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{service.lastError}</AlertDescription>
            </Alert>
          )}

          {/* QR Code Display */}
          {service.qrCode && (
            <div className="border-2 border-primary rounded-lg p-4 sm:p-6 bg-muted/30 space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base sm:text-lg">Scan QR Code to Connect</h3>
              </div>
              
              <div className="bg-background p-4 rounded-lg border-2">
                <div className="flex justify-center">
                  <Image
                    src={service.qrCode}
                    alt="WhatsApp QR Code"
                    width={256}
                    height={256}
                    className="rounded-md"
                  />
                </div>
              </div>
              
              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <p>Open WhatsApp on your phone → Settings → Linked Devices → Link a Device</p>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <p>Point your camera at the QR code above to connect</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-muted/30 border-t flex gap-2 p-4">
          {!service.isEnabled ? (
            <Button
              onClick={() => handleEnable('WHATSAPP')}
              disabled={actionLoading['WHATSAPP-enable']}
              className="w-full h-10"
            >
              {actionLoading['WHATSAPP-enable'] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Enable WhatsApp
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => handleDisable('WHATSAPP')}
              disabled={actionLoading['WHATSAPP-disable']}
              variant="destructive"
              className="w-full h-10"
            >
              {actionLoading['WHATSAPP-disable'] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Disable & Delete
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
    const showConfigForm = emailConfigMode || (!hasConfig && !service.isEnabled)

    return (
      <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Email Service</CardTitle>
                <CardDescription className="text-sm mt-0.5">
                  SMTP email notifications and alerts
                </CardDescription>
              </div>
            </div>
            {getStatusBadge(service.connectionStatus)}
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Status Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Status</span>
              </div>
              <p className="text-sm sm:text-base font-semibold">
                {service.isEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>

            <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1.5">
                <Server className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Config</span>
              </div>
              <p className="text-sm sm:text-base font-semibold">
                {hasConfig ? 'Set' : 'Not Set'}
              </p>
            </div>

            {hasConfig && !showConfigForm && (
              <>
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border col-span-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Server className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">SMTP Host</span>
                  </div>
                  <p className="text-sm font-semibold truncate">{service.config.host}</p>
                </div>
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border col-span-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Email Address</span>
                  </div>
                  <p className="text-sm font-semibold truncate">{service.config.user}</p>
                </div>
              </>
            )}
          </div>

          {/* Error Display */}
          {service.lastError && (
            <Alert variant="destructive" className="bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{service.lastError}</AlertDescription>
            </Alert>
          )}

          {/* Configuration Required Alert */}
          {!hasConfig && !showConfigForm && (
            <Alert className="border-primary/20 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Configuration required before enabling this service
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration Form */}
          {showConfigForm && (
            <div className="border-2 border-primary/20 rounded-lg p-4 sm:p-6 bg-muted/30 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Edit className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base sm:text-lg">SMTP Configuration</h3>
              </div>

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="host" className="text-sm font-medium">SMTP Host *</Label>
                    <Input
                      id="host"
                      placeholder="smtp.gmail.com"
                      value={emailConfig.host}
                      onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="port" className="text-sm font-medium">SMTP Port *</Label>
                    <Input
                      id="port"
                      type="number"
                      placeholder="587"
                      value={emailConfig.port}
                      onChange={(e) => setEmailConfig({ ...emailConfig, port: parseInt(e.target.value) })}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user" className="text-sm font-medium">Email Address *</Label>
                  <Input
                    id="user"
                    type="email"
                    placeholder="your-email@gmail.com"
                    value={emailConfig.user}
                    onChange={(e) => setEmailConfig({ ...emailConfig, user: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password / App Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={emailConfig.password}
                    onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from" className="text-sm font-medium">From Email *</Label>
                  <Input
                    id="from"
                    type="email"
                    placeholder="noreply@fundifyhub.com"
                    value={emailConfig.from}
                    onChange={(e) => setEmailConfig({ ...emailConfig, from: e.target.value })}
                    className="h-10"
                  />
                </div>

                {/* Info Alert */}
                <Alert className="border-primary/20 bg-primary/5">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-xs sm:text-sm">
                    <strong>Test Email:</strong> We'll send a test email to verify configuration before saving.
                    {emailConfig.host.toLowerCase().includes('gmail') && (
                      <span className="block mt-1.5">
                        <strong>Gmail Users:</strong> Use an App Password instead of your regular password. 
                        <a 
                          href="https://myaccount.google.com/apppasswords" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline ml-1 text-primary hover:text-primary/80"
                        >
                          Generate one here
                        </a>
                      </span>
                    )}
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                  <Button
                    onClick={handleSaveEmailConfig}
                    disabled={actionLoading['email-config']}
                    className="flex-1 h-10"
                  >
                    {actionLoading['email-config'] ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing & Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Test & Save
                      </>
                    )}
                  </Button>
                  {hasConfig && (
                    <Button
                      onClick={() => setEmailConfigMode(false)}
                      variant="outline"
                      className="h-10"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-muted/30 border-t flex flex-col sm:flex-row gap-2 sm:gap-3 p-4">
          {!service.isEnabled ? (
            <>
              {hasConfig && !showConfigForm && (
                <Button
                  onClick={() => setEmailConfigMode(true)}
                  variant="outline"
                  className="w-full sm:flex-1 h-10"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Configuration
                </Button>
              )}
              <Button
                onClick={() => handleEnable('EMAIL')}
                disabled={actionLoading['EMAIL-enable'] || !hasConfig}
                className="w-full sm:flex-1 h-10"
              >
                {actionLoading['EMAIL-enable'] ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Enable Service
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => handleDisable('EMAIL')}
              disabled={actionLoading['EMAIL-disable']}
              variant="destructive"
              className="w-full h-10"
            >
              {actionLoading['EMAIL-disable'] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Disable & Delete
                </>
              )}
            </Button>
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
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-lg">
                  <Settings className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  Service Configuration
                </h1>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground ml-[52px]">
                Manage communication services for notifications and messaging
              </p>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              disabled={loading}
              size="default"
              className="self-start sm:self-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {/* Info Banner */}
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>Live Status:</strong> This page automatically refreshes every 5 seconds to show real-time service status.
            </AlertDescription>
          </Alert>
        </div>

        {/* Service Cards */}
        <div className="grid gap-6 lg:gap-8">
          {services.map((service) => {
            if (service.serviceName === 'EMAIL') {
              return <div key={service.serviceName}>{renderEmailCard(service)}</div>
            }
            if (service.serviceName === 'WHATSAPP') {
              return <div key={service.serviceName}>{renderWhatsAppCard(service)}</div>
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
