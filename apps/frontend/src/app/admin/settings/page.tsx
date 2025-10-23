"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label" 
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Mail,
  MessageSquare,
  CheckCircle2,
  XCircle,
  RefreshCw,
  QrCode,
  Loader2,
  AlertCircle,
  Info,
  ExternalLink,
  Clock,
  Power,
  Zap,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiUrl, API_CONFIG } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AdminSettingsPage() {
  const { toast } = useToast()
  
  // WhatsApp service state
  const [whatsappService, setWhatsappService] = useState({
    isActive: false,
    connectionStatus: 'DISABLED',
    isConnecting: false,
    isInitializing: false,
    qrCode: null as string | null,
    lastConnected: null as string | null,
    lastError: null as string | null,
    clientId: 'fundifyhub-admin-frontend'
  })
  
  // Email service state
  const [emailService, setEmailService] = useState({
    isActive: false,
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
  
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  // Service status configuration
  const getServiceStatus = (service: typeof whatsappService | typeof emailService) => {
    const isConnecting = 'isInitializing' in service 
      ? (service.isConnecting || service.isInitializing)
      : service.isConnecting
      
    if (isConnecting) {
      return { 
        icon: Loader2, 
        text: 'Connecting...', 
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20'
      }
    }
    if (service.isActive) {
      return { 
        icon: CheckCircle2, 
        text: 'Active', 
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20'
      }
    }
    if (service.lastError) {
      return { 
        icon: XCircle, 
        text: 'Error', 
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20'
      }
    }
    return { 
      icon: Power, 
      text: 'Disabled', 
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/20'
    }
  }

  // Load initial service status on mount
  useEffect(() => {
    const loadInitialStatus = async () => {
      try {
        // Load WhatsApp status
        const whatsappResponse = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.WHATSAPP_STATUS), {
          credentials: 'include',
        })
        const whatsappData = await whatsappResponse.json()
        
        if (whatsappData.success && whatsappData.data) {
          console.log('📊 Initial WhatsApp status:', whatsappData.data)
          setWhatsappService(prev => ({
            ...prev,
            isActive: whatsappData.data.isActive || false,
            connectionStatus: whatsappData.data.status || 'DISABLED',
            isConnecting: false,
            isInitializing: false,
            lastConnected: whatsappData.data.lastConnectedAt || whatsappData.data.lastConnected,
            lastError: whatsappData.data.lastError
          }))
        }

        // Load Email status
        const emailResponse = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.EMAIL_STATUS), {
          credentials: 'include',
        })
        const emailData = await emailResponse.json()
        
        if (emailData.success && emailData.data) {
          console.log('📊 Initial Email status:', emailData.data)
          setEmailService(prev => ({
            ...prev,
            isActive: emailData.data.isActive || false,
            connectionStatus: emailData.data.status || 'DISABLED',
            isConnecting: false,
            lastConnected: emailData.data.lastConnectedAt || emailData.data.lastConnected,
            lastError: emailData.data.lastError,
            // Load config if available
            config: emailData.data.config ? {
              smtpHost: emailData.data.config.smtpHost || prev.config.smtpHost,
              smtpPort: emailData.data.config.smtpPort || prev.config.smtpPort,
              smtpSecure: emailData.data.config.smtpSecure ?? prev.config.smtpSecure,
              smtpUser: emailData.data.config.smtpUser || prev.config.smtpUser,
              smtpPass: emailData.data.config.smtpPass || prev.config.smtpPass,
              smtpFrom: emailData.data.config.smtpFrom || prev.config.smtpFrom,
            } : prev.config
          }))
        }
      } catch (error) {
        console.error('❌ Failed to load initial status:', error)
      }
    }

    loadInitialStatus()
  }, [])

  // WhatsApp Functions
  const connectWhatsApp = async () => {
    try {
      setWhatsappService(prev => ({ 
        ...prev, 
        isInitializing: true,
        isConnecting: true,
        lastError: null 
      }))

      toast({
        title: "🔄 Initializing WhatsApp...",
        description: "Please wait while we connect to WhatsApp service",
      })

      // First, enable the service in backend
      const configResponse = await fetch(apiUrl(`${API_CONFIG.ENDPOINTS.ADMIN.SERVICES_CONFIG}/WHATSAPP`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: true })
      })

      if (!configResponse.ok) {
        const errorData = await configResponse.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `HTTP ${configResponse.status}: ${configResponse.statusText}`
        throw new Error(errorMessage)
      }

      const configData = await configResponse.json()
      if (!configData.success) {
        throw new Error(configData.error || configData.message || 'Failed to enable WhatsApp service')
      }

      // Then connect and get QR code
      const controller = new AbortController()
      setAbortController(controller)

      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.WHATSAPP_QR), {
        credentials: 'include',
        headers: {
          'Accept': 'text/event-stream',
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `Failed to initialize: ${response.status} ${response.statusText}`
        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const rawData = line.slice(6)
                  console.log('📨 SSE Raw data:', rawData)
                  const message = JSON.parse(rawData)
                  console.log('📨 SSE Parsed message:', message)
                  
                  // Handle both old flat format and new nested format
                  const eventType = message.type || message.status
                  const eventData = message.data || message
                  const status = eventData.connectionStatus || eventType
                  
                  console.log('📊 Extracted status:', status, 'Event type:', eventType)
                  
                  switch (status) {
                    case 'INITIALIZING':
                      console.log('✅ Setting state: INITIALIZING')
                      setWhatsappService(prev => ({ 
                        ...prev, 
                        connectionStatus: 'INITIALIZING',
                        isInitializing: true,
                        lastError: null
                      }))
                      break
                    
                    case 'WAITING_FOR_QR_SCAN':
                      console.log('✅ Setting state: WAITING_FOR_QR_SCAN with QR code:', !!eventData.qrCode)
                      setWhatsappService(prev => ({
                        ...prev,
                        qrCode: eventData.qrCode,
                        connectionStatus: 'WAITING_FOR_QR_SCAN',
                        isInitializing: false,
                        lastError: null
                      }))
                      break
                    
                    case 'AUTHENTICATED':
                      console.log('✅ Setting state: AUTHENTICATED')
                      setWhatsappService(prev => ({ 
                        ...prev, 
                        connectionStatus: 'AUTHENTICATED',
                        lastError: null
                      }))
                      break
                    
                    case 'CONNECTED':
                    case 'READY':
                      console.log('✅ Setting state: CONNECTED')
                      setWhatsappService(prev => ({
                        ...prev,
                        isActive: true,
                        connectionStatus: 'CONNECTED',
                        isInitializing: false,
                        isConnecting: false,
                        qrCode: null,
                        lastConnected: new Date().toISOString(),
                        lastError: null
                      }))
                      toast({
                        title: "✅ WhatsApp Connected",
                        description: "WhatsApp service is now active and ready to send OTPs",
                      })
                      break
                    
                    case 'DISCONNECTED':
                    case 'DISABLED':
                      console.log('✅ Setting state:', status)
                      setWhatsappService(prev => ({
                        ...prev,
                        isActive: false,
                        connectionStatus: status,
                        qrCode: null,
                        isInitializing: false
                      }))
                      break
                    
                    case 'AUTH_FAILURE':
                      console.log('❌ Setting state: AUTH_FAILURE')
                      const errorMsg = eventData.message || eventData.error || 'Authentication failed'
                      setWhatsappService(prev => ({
                        ...prev,
                        isActive: false,
                        connectionStatus: 'AUTH_FAILURE',
                        lastError: errorMsg,
                        qrCode: null,
                        isInitializing: false
                      }))
                      toast({
                        variant: "destructive",
                        title: "❌ Authentication Failed",
                        description: errorMsg,
                      })
                      break

                    case 'TIMEOUT':
                      console.log('⏱️ Setting state: TIMEOUT')
                      setWhatsappService(prev => ({
                        ...prev,
                        isActive: false,
                        connectionStatus: 'TIMEOUT',
                        lastError: 'QR code expired after 3 minutes',
                        qrCode: null,
                        isInitializing: false
                      }))
                      toast({
                        variant: "destructive",
                        title: "⏱️ QR Code Expired",
                        description: "The QR code expired. Please try connecting again.",
                      })
                      break
                      
                    default:
                      console.log('⚠️ Unknown status:', status)
                  }
                } catch (e) {
                  console.error('❌ Error parsing SSE data:', e, 'Raw line:', line)
                }
              }
            }
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('❌ Stream error:', error)
          }
        }
      }

      await processStream()

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ WhatsApp connection error:', error)
        const errorMessage = error.message || 'Failed to connect to WhatsApp'
        setWhatsappService(prev => ({
          ...prev,
          isInitializing: false,
          isConnecting: false,
          lastError: errorMessage
        }))
        toast({
          variant: "destructive",
          title: "❌ Connection Failed",
          description: errorMessage,
        })
      }
    }
  }

  const disconnectWhatsApp = async () => {
    try {
      if (abortController) {
        abortController.abort()
        setAbortController(null)
      }

      setWhatsappService(prev => ({ ...prev, isConnecting: true, lastError: null }))

      const response = await fetch(apiUrl(`${API_CONFIG.ENDPOINTS.ADMIN.SERVICES_CONFIG}/WHATSAPP`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: false })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to disconnect WhatsApp')
      }

      setWhatsappService(prev => ({
        ...prev,
        isActive: false,
        connectionStatus: 'DISABLED',
        qrCode: null,
        isConnecting: false,
        isInitializing: false,
        lastError: null
      }))

      toast({
        title: "✅ WhatsApp Disconnected",
        description: "WhatsApp service has been disabled",
      })
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to disconnect WhatsApp'
      setWhatsappService(prev => ({ 
        ...prev, 
        isConnecting: false,
        lastError: errorMessage
      }))
      toast({
        variant: "destructive",
        title: "❌ Disconnect Failed",
        description: errorMessage,
      })
    }
  }

  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.WHATSAPP_STATUS), {
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to fetch WhatsApp status')
      }
      
      if (data.data) {
        setWhatsappService(prev => ({
          ...prev,
          isActive: data.data.isActive,
          connectionStatus: data.data.status,
          lastConnected: data.data.lastConnectedAt || data.data.lastConnected,
          lastError: data.data.lastError
        }))
      }
      
      toast({
        title: "✅ Status Updated",
        description: `WhatsApp is ${data.data.isActive ? 'active' : 'inactive'}`,
      })
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to check WhatsApp status'
      toast({
        variant: "destructive",
        title: "❌ Status Check Failed",
        description: errorMessage,
      })
    }
  }

  // Email Functions
  const testEmailConnection = async () => {
    try {
      setEmailService(prev => ({ ...prev, isConnecting: true, lastError: null }))

      // First, fetch current config from backend if we don't have it locally
      let configToUse = emailService.config
      
      if (!emailService.config.smtpHost || !emailService.config.smtpUser || !emailService.config.smtpPass) {
        // Load config from backend
        const statusResponse = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.EMAIL_STATUS), {
          credentials: 'include',
        })
        const statusData = await statusResponse.json()
        
        if (statusData.success && statusData.data?.config) {
          configToUse = statusData.data.config
          // Update local state with backend config
          setEmailService(prev => ({
            ...prev,
            config: statusData.data.config
          }))
        } else {
          throw new Error('No email configuration found. Please configure email settings first.')
        }
      }

      // Enable the service with config
      const response = await fetch(apiUrl(`${API_CONFIG.ENDPOINTS.ADMIN.SERVICES_CONFIG}/EMAIL`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: true,
          config: configToUse
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to enable email service')
      }

      // Test the connection with config
      const testResponse = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.EMAIL_TEST_CONNECT), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configToUse })
      })

      if (!testResponse.ok) {
        const errorData = await testResponse.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `Test failed: HTTP ${testResponse.status}`
        throw new Error(errorMessage)
      }

      const testData = await testResponse.json()

      if (!testData.success) {
        throw new Error(testData.error || testData.message || testData.data?.lastError || 'Failed to test email connection')
      }

      // The backend polls internally, but if we get here, it's successful
      if (testData.data && testData.data.isActive) {
        setEmailService(prev => ({
          ...prev,
          isActive: true,
          connectionStatus: 'CONNECTED',
          isConnecting: false,
          lastConnected: new Date().toISOString(),
          lastError: null
        }))

        toast({
          title: "✅ Email Connected",
          description: "Email service is now active. Test email sent!",
        })
      } else {
        // If not active yet, poll for status (fallback)
        toast({
          title: "⏳ Connecting...",
          description: "Testing email connection, please wait...",
        })
        
        // Poll for status updates
        let attempts = 0
        const maxAttempts = 20 // 20 attempts * 1 second = 20 seconds max
        
        const pollStatus = async () => {
          attempts++
          
          const statusResponse = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.EMAIL_STATUS), {
            credentials: 'include',
          })
          const statusData = await statusResponse.json()
          
          if (statusData.success && statusData.data) {
            if (statusData.data.isActive && statusData.data.status === 'CONNECTED') {
              setEmailService(prev => ({
                ...prev,
                isActive: true,
                connectionStatus: 'CONNECTED',
                isConnecting: false,
                lastConnected: new Date().toISOString(),
                lastError: null
              }))
              
              toast({
                title: "✅ Email Connected",
                description: "Email service is now active. Test email sent!",
              })
              return
            }
            
            if (statusData.data.lastError) {
              throw new Error(statusData.data.lastError)
            }
          }
          
          if (attempts < maxAttempts) {
            setTimeout(pollStatus, 1000)
          } else {
            throw new Error('Connection timeout - please check email status')
          }
        }
        
        await pollStatus()
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to connect email service'
      setEmailService(prev => ({
        ...prev,
        isConnecting: false,
        lastError: errorMessage
      }))
      toast({
        variant: "destructive",
        title: "❌ Connection Failed",
        description: errorMessage,
      })
    }
  }

  const disconnectEmail = async () => {
    try {
      setEmailService(prev => ({ ...prev, isConnecting: true, lastError: null }))

      const response = await fetch(apiUrl(`${API_CONFIG.ENDPOINTS.ADMIN.SERVICES_CONFIG}/EMAIL`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: false })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to disconnect email service')
      }

      setEmailService(prev => ({
        ...prev,
        isActive: false,
        connectionStatus: 'DISABLED',
        isConnecting: false,
        lastError: null
      }))

      toast({
        title: "✅ Email Disconnected",
        description: "Email service has been disabled",
      })
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to disconnect email service'
      setEmailService(prev => ({ 
        ...prev, 
        isConnecting: false,
        lastError: errorMessage
      }))
      toast({
        variant: "destructive",
        title: "❌ Disconnect Failed",
        description: errorMessage,
      })
    }
  }

  const checkEmailStatus = async () => {
    try {
      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.EMAIL_STATUS), {
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to fetch email status')
      }
      
      if (data.data) {
        setEmailService(prev => ({
          ...prev,
          isActive: data.data.isActive,
          connectionStatus: data.data.status,
          lastConnected: data.data.lastConnectedAt || data.data.lastConnected,
          lastError: data.data.lastError,
          // Load config if available
          config: data.data.config ? {
            smtpHost: data.data.config.smtpHost || prev.config.smtpHost,
            smtpPort: data.data.config.smtpPort || prev.config.smtpPort,
            smtpSecure: data.data.config.smtpSecure ?? prev.config.smtpSecure,
            smtpUser: data.data.config.smtpUser || prev.config.smtpUser,
            smtpPass: data.data.config.smtpPass || prev.config.smtpPass,
            smtpFrom: data.data.config.smtpFrom || prev.config.smtpFrom,
          } : prev.config
        }))
      }
      
      toast({
        title: "✅ Status Updated",
        description: `Email is ${data.data.isActive ? 'active' : 'inactive'}`,
      })
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to check email status'
      toast({
        variant: "destructive",
        title: "❌ Status Check Failed",
        description: errorMessage,
      })
    }
  }

  const testEmailConfiguration = async () => {
    try {
      setEmailService(prev => ({ ...prev, isTesting: true }))

      const response = await fetch(apiUrl(API_CONFIG.ENDPOINTS.ADMIN.EMAIL_TEST), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: emailService.config.smtpUser 
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to send test email')
      }

      toast({
        title: "✅ Test Email Sent",
        description: "Check your inbox for the test email",
      })
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to test email configuration'
      toast({
        variant: "destructive",
        title: "❌ Test Failed",
        description: errorMessage,
      })
    } finally {
      setEmailService(prev => ({ ...prev, isTesting: false }))
    }
  }

  const whatsappStatus = getServiceStatus(whatsappService)
  const emailStatus = getServiceStatus(emailService)

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage OTP services and system configuration</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="otp-services" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="otp-services" className="gap-2">
            <Zap className="w-4 h-4" />
            OTP Services
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
        </TabsList>

        {/* OTP Services Tab */}
        <TabsContent value="otp-services" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* WhatsApp Service Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <CardTitle>WhatsApp OTP</CardTitle>
                      <CardDescription>Send OTPs via WhatsApp</CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${whatsappStatus.bgColor} ${whatsappStatus.borderColor} ${whatsappStatus.color}`}
                  >
                    <whatsappStatus.icon className={`w-3 h-3 mr-1 ${(whatsappService.isConnecting || whatsappService.isInitializing) ? 'animate-spin' : ''}`} />
                    {whatsappStatus.text}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Error Alert */}
                {whatsappService.lastError && (
                  <Alert variant="destructive" className="animate-in fade-in-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="font-medium">
                      {whatsappService.lastError}
                    </AlertDescription>
                  </Alert>
                )}

                {/* QR Code Section */}
                {whatsappService.qrCode && (
                  <div className="p-6 rounded-lg bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800">
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <QrCode className="w-5 h-5" />
                        <span className="font-semibold">Scan QR Code</span>
                        <Badge variant="outline" className="ml-2 bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400">
                          <Clock className="w-3 h-3 mr-1" />
                          3 min
                        </Badge>
                      </div>
                      
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
                        <img 
                          src={whatsappService.qrCode} 
                          alt="WhatsApp QR Code" 
                          className="w-48 h-48"
                        />
                      </div>

                      <div className="text-center space-y-2 max-w-sm">
                        <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-xs font-bold">1</div>
                          <span>Open WhatsApp on your phone</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-xs font-bold">2</div>
                          <span>Go to Settings → Linked Devices</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-xs font-bold">3</div>
                          <span>Scan this QR code</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Connected Status */}
                {whatsappService.isActive && !whatsappService.qrCode && (
                  <Alert className="bg-green-500/10 border-green-500/30 animate-in fade-in-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      <div className="font-medium mb-1.5">WhatsApp is connected and operational</div>
                      {whatsappService.lastConnected && (
                        <div className="text-xs flex items-center gap-1.5 opacity-90">
                          <Clock className="w-3 h-3" />
                          <span>Last connected: {new Date(whatsappService.lastConnected).toLocaleString()}</span>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Initializing State */}
                {whatsappService.isInitializing && !whatsappService.qrCode && (
                  <Alert className="bg-blue-500/10 border-blue-500/30 animate-in fade-in-50">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-700 dark:text-blue-300 font-medium">
                      Initializing WhatsApp connection, please wait...
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>

              <CardFooter className="flex gap-2 pt-4">
                {!whatsappService.isActive ? (
                  <Button 
                    onClick={connectWhatsApp}
                    disabled={whatsappService.isConnecting || whatsappService.isInitializing}
                    className="flex-1 h-10"
                    size="default"
                  >
                    {(whatsappService.isInitializing || whatsappService.isConnecting) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Connect WhatsApp
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={checkWhatsAppStatus}
                      className="flex-1 h-10"
                      size="default"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={disconnectWhatsApp}
                      disabled={whatsappService.isConnecting}
                      className="h-10"
                      size="default"
                    >
                      <Power className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>

            {/* Email Service Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle>Email OTP</CardTitle>
                      <CardDescription>Send OTPs via Email</CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${emailStatus.bgColor} ${emailStatus.borderColor} ${emailStatus.color}`}
                  >
                    <emailStatus.icon className={`w-3 h-3 mr-1 ${emailService.isConnecting ? 'animate-spin' : ''}`} />
                    {emailStatus.text}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Error Alert */}
                {emailService.lastError && (
                  <Alert variant="destructive" className="animate-in fade-in-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="font-medium">
                      {emailService.lastError}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Gmail Helper */}
                {emailService.config.smtpHost.includes('gmail') && !emailService.isActive && (
                  <Alert className="bg-blue-500/10 border-blue-500/30 animate-in fade-in-50">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-700 dark:text-blue-300">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">Gmail requires an App Password (not your regular password)</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          asChild
                          className="h-auto p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-500/10 shrink-0"
                        >
                          <a 
                            href="https://myaccount.google.com/apppasswords" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            Get Password
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Connected Status */}
                {emailService.isActive && (
                  <Alert className="bg-green-500/10 border-green-500/30 animate-in fade-in-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      <div className="font-medium mb-1.5">Email service is connected and operational</div>
                      {emailService.lastConnected && (
                        <div className="text-xs flex items-center gap-1.5 opacity-90">
                          <Clock className="w-3 h-3" />
                          <span>Last connected: {new Date(emailService.lastConnected).toLocaleString()}</span>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Configuration Form */}
                {!emailService.isActive && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input
                          id="smtpHost"
                          value={emailService.config.smtpHost}
                          onChange={(e) => setEmailService(prev => ({
                            ...prev,
                            config: { ...prev.config, smtpHost: e.target.value }
                          }))}
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="smtpPort">Port</Label>
                        <Input
                          id="smtpPort"
                          type="number"
                          value={emailService.config.smtpPort}
                          onChange={(e) => setEmailService(prev => ({
                            ...prev,
                            config: { ...prev.config, smtpPort: parseInt(e.target.value) }
                          }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="smtpUser">Email Address</Label>
                      <Input
                        id="smtpUser"
                        type="email"
                        value={emailService.config.smtpUser}
                        onChange={(e) => setEmailService(prev => ({
                          ...prev,
                          config: { ...prev.config, smtpUser: e.target.value }
                        }))}
                        placeholder="your-email@gmail.com"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="smtpPass">Password / App Password</Label>
                      <Input
                        id="smtpPass"
                        type="password"
                        value={emailService.config.smtpPass}
                        onChange={(e) => setEmailService(prev => ({
                          ...prev,
                          config: { ...prev.config, smtpPass: e.target.value }
                        }))}
                        placeholder="••••••••••••••••"
                      />
                      <p className="text-xs text-muted-foreground">
                        For Gmail, use an App Password instead of your account password
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id="smtpSecure"
                        checked={emailService.config.smtpSecure}
                        onCheckedChange={(checked) => setEmailService(prev => ({
                          ...prev,
                          config: { ...prev.config, smtpSecure: checked }
                        }))}
                      />
                      <Label htmlFor="smtpSecure" className="text-sm font-normal">
                        Use SSL/TLS
                      </Label>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex gap-2 pt-4">
                {!emailService.isActive ? (
                  <Button 
                    onClick={testEmailConnection}
                    disabled={emailService.isConnecting || !emailService.config.smtpHost || !emailService.config.smtpUser || !emailService.config.smtpPass}
                    className="flex-1 h-10"
                    size="default"
                  >
                    {emailService.isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Test & Connect
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={checkEmailStatus}
                      className="flex-1 h-10"
                      size="default"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={testEmailConfiguration}
                      disabled={emailService.isTesting}
                      className="h-10"
                      size="default"
                    >
                      {emailService.isTesting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4 mr-2" />
                      )}
                      Test
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={disconnectEmail}
                      disabled={emailService.isConnecting}
                      className="h-10"
                      size="default"
                    >
                      <Power className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Coming soon - platform configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                General settings will be available in the next update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
