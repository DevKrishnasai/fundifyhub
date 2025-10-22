"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, ArrowLeft, CreditCard, User, Mail, Phone, Lock, ChevronRight, ChevronLeft, Check, X, CheckCircle, MessageSquare } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1)
  
  // UI states
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  
  // Step 1 form data
  const [step1Data, setStep1Data] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  })
  
  // Step 2 form data
  const [step2Data, setStep2Data] = useState({
    email: "",
    phoneNumber: "",
    emailOTP: "",
    phoneOTP: "",
  })
  
  // Validation states
  const [emailValidation, setEmailValidation] = useState({ isValid: false, isChecking: false, error: "" })
  const [phoneValidation, setPhoneValidation] = useState({ isValid: false, isChecking: false, error: "" })
  const [emailOTPSent, setEmailOTPSent] = useState(false)
  const [phoneOTPSent, setPhoneOTPSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [otpLoading, setOtpLoading] = useState({ email: false, phone: false })
  const [verifyLoading, setVerifyLoading] = useState({ email: false, phone: false })
  const [resendLoading, setResendLoading] = useState({ email: false, phone: false })

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    let strength = 0
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    }
    
    strength = Object.values(checks).filter(Boolean).length
    return { strength, checks }
  }

  // Step 1 validation
  const validateStep1 = () => {
    if (!step1Data.firstName.trim() || !step1Data.lastName.trim()) {
      setError("Please fill in all name fields")
      return false
    }
    
    if (step1Data.password.length < 8) {
      setError("Password must be at least 8 characters long")
      return false
    }
    
    const { strength } = getPasswordStrength(step1Data.password)
    if (strength < 3) {
      setError("Password is too weak. Please include uppercase, lowercase, and numbers")
      return false
    }
    
    if (step1Data.password !== step1Data.confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    
    return true
  }

  // Check if email exists
  const checkEmailExists = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailValidation({ isValid: false, isChecking: false, error: "Invalid email format" })
      return
    }

    setEmailValidation({ isValid: false, isChecking: true, error: "" })
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/v1/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setEmailValidation({ isValid: true, isChecking: false, error: "" })
      } else {
        setEmailValidation({ isValid: false, isChecking: false, error: data.message || "Email already exists" })
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/v1/auth/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setPhoneValidation({ isValid: true, isChecking: false, error: "" })
      } else {
        setPhoneValidation({ isValid: false, isChecking: false, error: data.message || "Phone number already exists" })
      }
    } catch (error) {
      setPhoneValidation({ isValid: false, isChecking: false, error: "Unable to verify phone number" })
    }
  }

  // Send OTP for email
  const sendEmailOTP = async () => {
    setOtpLoading(prev => ({ ...prev, email: true }))
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/v1/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'EMAIL',
          firstName: step1Data.firstName,
          lastName: step1Data.lastName,
          email: step2Data.email,
          phoneNumber: step2Data.phoneNumber,
          password: step1Data.password
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setEmailOTPSent(true)
        toast({
          title: "Email OTP sent!",
          description: "Verification code sent to your email",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Failed to send email OTP",
          description: data.message,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Unable to send email OTP. Please try again.",
      })
    } finally {
      setOtpLoading(prev => ({ ...prev, email: false }))
    }
  }

  // Send OTP for phone
  const sendPhoneOTP = async () => {
    setOtpLoading(prev => ({ ...prev, phone: true }))
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/v1/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'PHONE',
          firstName: step1Data.firstName,
          lastName: step1Data.lastName,
          email: step2Data.email,
          phoneNumber: step2Data.phoneNumber,
          password: step1Data.password
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setPhoneOTPSent(true)
        toast({
          title: "Phone OTP sent!",
          description: "Verification code sent to your phone",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Failed to send phone OTP",
          description: data.message,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Unable to send phone OTP. Please try again.",
      })
    } finally {
      setOtpLoading(prev => ({ ...prev, phone: false }))
    }
  }

  // Verify individual OTP
  const verifyOTP = async (type: 'EMAIL' | 'PHONE') => {
    const otp = type === 'EMAIL' ? step2Data.emailOTP : step2Data.phoneOTP;
    const identifier = type === 'EMAIL' ? step2Data.email : step2Data.phoneNumber;
    
    if (otp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
      })
      return
    }

    setVerifyLoading(prev => ({ 
      ...prev, 
      [type.toLowerCase()]: true 
    }))
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type,
          otp,
          email: step2Data.email,
          phoneNumber: step2Data.phoneNumber
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        if (type === 'EMAIL') {
          setEmailVerified(true)
        } else {
          setPhoneVerified(true)
        }
        
        toast({
          title: `${type.toLowerCase()} verified!`,
          description: data.message,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: data.message,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Unable to verify OTP. Please try again.",
      })
    } finally {
      setVerifyLoading(prev => ({ 
        ...prev, 
        [type.toLowerCase()]: false 
      }))
    }
  }

  // Resend OTP
  const resendOTP = async (type: 'EMAIL' | 'PHONE') => {
    setResendLoading(prev => ({ 
      ...prev, 
      [type.toLowerCase()]: true 
    }))
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/v1/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type,
          email: step2Data.email,
          phoneNumber: step2Data.phoneNumber
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Clear the OTP input
        if (type === 'EMAIL') {
          setStep2Data(prev => ({ ...prev, emailOTP: '' }))
        } else {
          setStep2Data(prev => ({ ...prev, phoneOTP: '' }))
        }
        
        toast({
          title: "OTP resent!",
          description: data.message,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Failed to resend OTP",
          description: data.message,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Unable to resend OTP. Please try again.",
      })
    } finally {
      setResendLoading(prev => ({ 
        ...prev, 
        [type.toLowerCase()]: false 
      }))
    }
  }

  // Complete registration after both OTPs are verified
  const completeRegistration = async () => {
    if (!emailVerified || !phoneVerified) {
      toast({
        variant: "destructive",
        title: "Verification required",
        description: "Please verify both email and phone before proceeding",
      })
      return
    }

    setIsLoading(true)
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/v1/auth/complete-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstName: step1Data.firstName,
          lastName: step1Data.lastName,
          email: step2Data.email,
          phoneNumber: step2Data.phoneNumber,
          password: step1Data.password
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        toast({
          title: "Registration successful!",
          description: "Your account has been created successfully.",
        })
        
        router.push('/dashboard')
      } else {
        setError(data.message || "Registration failed. Please try again.")
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: data.message,
        })
      }
    } catch (error) {
      setError("Network error. Please check your connection and try again.")
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Unable to complete registration. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Check if we can send individual OTPs
  const canSendEmailOTP = () => {
    return emailValidation.isValid && !emailValidation.isChecking && !emailOTPSent
  }

  const canSendPhoneOTP = () => {
    return phoneValidation.isValid && !phoneValidation.isChecking && !phoneOTPSent
  }

  // Check if we can verify individual OTPs
  const canVerifyEmailOTP = () => {
    return emailOTPSent && !emailVerified && step2Data.emailOTP.length === 6
  }

  const canVerifyPhoneOTP = () => {
    return phoneOTPSent && !phoneVerified && step2Data.phoneOTP.length === 6
  }

  // Check if registration can be completed
  const canCompleteRegistration = () => {
    return emailVerified && phoneVerified && acceptTerms
  }

  // Handle step navigation
  const nextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
      setError("")
    }
  }

  const prevStep = () => {
    setCurrentStep(1)
    setError("")
  }

  // Real-time validation for step 2
  useEffect(() => {
    if (step2Data.email) {
      const timeout = setTimeout(() => checkEmailExists(step2Data.email), 500)
      return () => clearTimeout(timeout)
    }
  }, [step2Data.email])

  useEffect(() => {
    if (step2Data.phoneNumber) {
      const timeout = setTimeout(() => checkPhoneExists(step2Data.phoneNumber), 500)
      return () => clearTimeout(timeout)
    }
  }, [step2Data.phoneNumber])

  const { strength: passwordStrength, checks: passwordChecks } = getPasswordStrength(step1Data.password)

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        <div className="flex justify-start">
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/auth/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">FundifyHub</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Create your account - Step {currentStep} of 2
          </p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              1
            </div>
            <span className="text-sm">Basic Info</span>
          </div>
          <div className="w-12 h-0.5 bg-muted" />
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              2
            </div>
            <span className="text-sm">Contact & Verify</span>
          </div>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">
              {currentStep === 1 ? "Basic Information" : "Contact Information & Verification"}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {currentStep === 1 
                ? "Enter your name and create a secure password" 
                : "Enter your contact details and verify with OTP"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={step1Data.firstName}
                        onChange={(e) => setStep1Data(prev => ({ ...prev, firstName: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={step1Data.lastName}
                        onChange={(e) => setStep1Data(prev => ({ ...prev, lastName: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={step1Data.password}
                      onChange={(e) => setStep1Data(prev => ({ ...prev, password: e.target.value }))}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {step1Data.password && (
                    <div className="mt-2">
                      <div className="flex space-x-1 mb-2">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded ${
                              passwordStrength >= level
                                ? passwordStrength <= 2
                                  ? 'bg-red-500'
                                  : passwordStrength <= 3
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center space-x-2">
                          {passwordChecks.length ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-red-500" />}
                          <span className={passwordChecks.length ? 'text-green-600' : 'text-red-600'}>
                            At least 8 characters
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {passwordChecks.lowercase && passwordChecks.uppercase ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-red-500" />}
                          <span className={passwordChecks.lowercase && passwordChecks.uppercase ? 'text-green-600' : 'text-red-600'}>
                            Upper & lowercase letters
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {passwordChecks.number ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-red-500" />}
                          <span className={passwordChecks.number ? 'text-green-600' : 'text-red-600'}>
                            At least one number
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={step1Data.confirmPassword}
                      onChange={(e) => setStep1Data(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {step1Data.confirmPassword && step1Data.password !== step1Data.confirmPassword && (
                    <p className="text-sm text-red-600">Passwords do not match</p>
                  )}
                </div>

                <Button onClick={nextStep} className="w-full" size="lg">
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Contact Information & Verification */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Contact Information Section */}
                <div className="space-y-4">
                  {/* Email Section */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={step2Data.email}
                        onChange={(e) => setStep2Data(prev => ({ ...prev, email: e.target.value }))}
                        className={`pl-10 pr-10 ${
                          emailValidation.error ? 'border-red-500' : 
                          emailValidation.isValid ? 'border-green-500' : ''
                        }`}
                        disabled={emailOTPSent}
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
                      <p className="text-sm text-red-600">{emailValidation.error}</p>
                    )}
                  </div>

                  {/* Phone Section */}
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={step2Data.phoneNumber}
                        onChange={(e) => setStep2Data(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        className={`pl-10 pr-10 ${
                          phoneValidation.error ? 'border-red-500' : 
                          phoneValidation.isValid ? 'border-green-500' : ''
                        }`}
                        disabled={phoneOTPSent}
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
                      <p className="text-sm text-red-600">{phoneValidation.error}</p>
                    )}
                  </div>


                </div>

                {/* Email Verification Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailOTP" className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>Email Verification</span>
                      </div>
                      {emailVerified && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Verified</span>
                        </div>
                      )}
                    </Label>
                    
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <Input
                          id="emailOTP"
                          type="text"
                          placeholder="Enter 6-digit email OTP"
                          value={step2Data.emailOTP}
                          onChange={(e) => setStep2Data(prev => ({ ...prev, emailOTP: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                          maxLength={6}
                          disabled={emailVerified}
                          className="text-center text-lg tracking-widest font-mono flex-1"
                        />
                        <Button
                          onClick={sendEmailOTP}
                          disabled={!canSendEmailOTP() || otpLoading.email}
                          variant={emailOTPSent ? "secondary" : "default"}
                          size="sm"
                        >
                          {otpLoading.email ? (
                            <Spinner size="sm" />
                          ) : emailOTPSent ? (
                            'Sent'
                          ) : (
                            'Send'
                          )}
                        </Button>
                      </div>
                      
                      {emailOTPSent && (
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => verifyOTP('EMAIL')}
                            disabled={!canVerifyEmailOTP() || verifyLoading.email || emailVerified}
                            className="flex-1"
                            size="sm"
                          >
                            {verifyLoading.email ? (
                              <>
                                <Spinner size="sm" className="mr-2" />
                                Verifying...
                              </>
                            ) : emailVerified ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verified
                              </>
                            ) : (
                              'Verify Email'
                            )}
                          </Button>
                          <Button
                            onClick={() => resendOTP('EMAIL')}
                            disabled={resendLoading.email || emailVerified}
                            variant="outline"
                            size="sm"
                          >
                            {resendLoading.email ? (
                              <Spinner size="sm" />
                            ) : (
                              'Resend'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phone Verification Section */}
                  <div className="space-y-2">
                    <Label htmlFor="phoneOTP" className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Phone Verification</span>
                      </div>
                      {phoneVerified && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Verified</span>
                        </div>
                      )}
                    </Label>
                    
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <Input
                          id="phoneOTP"
                          type="text"
                          placeholder="Enter 6-digit phone OTP"
                          value={step2Data.phoneOTP}
                          onChange={(e) => setStep2Data(prev => ({ ...prev, phoneOTP: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                          maxLength={6}
                          disabled={phoneVerified}
                          className="text-center text-lg tracking-widest font-mono flex-1"
                        />
                        <Button
                          onClick={sendPhoneOTP}
                          disabled={!canSendPhoneOTP() || otpLoading.phone}
                          variant={phoneOTPSent ? "secondary" : "default"}
                          size="sm"
                        >
                          {otpLoading.phone ? (
                            <Spinner size="sm" />
                          ) : phoneOTPSent ? (
                            'Sent'
                          ) : (
                            'Send'
                          )}
                        </Button>
                      </div>
                      
                      {phoneOTPSent && (
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => verifyOTP('PHONE')}
                            disabled={!canVerifyPhoneOTP() || verifyLoading.phone || phoneVerified}
                            className="flex-1"
                            size="sm"
                          >
                            {verifyLoading.phone ? (
                              <>
                                <Spinner size="sm" className="mr-2" />
                                Verifying...
                              </>
                            ) : phoneVerified ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verified
                              </>
                            ) : (
                              'Verify Phone'
                            )}
                          </Button>
                          <Button
                            onClick={() => resendOTP('PHONE')}
                            disabled={resendLoading.phone || phoneVerified}
                            variant="outline"
                            size="sm"
                          >
                            {resendLoading.phone ? (
                              <Spinner size="sm" />
                            ) : (
                              'Resend'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="pt-4 border-t">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="terms"
                        checked={acceptTerms}
                        onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                        className="mt-1"
                      />
                      <Label htmlFor="terms" className="text-sm leading-relaxed">
                        I agree to the{" "}
                        <Link href="/terms" className="text-primary hover:underline">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex space-x-3">
                  <Button onClick={prevStep} variant="outline" className="flex-1">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  
                  <Button 
                    onClick={completeRegistration} 
                    disabled={!canCompleteRegistration() || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Creating Account...
                      </>
                    ) : emailVerified && phoneVerified ? (
                      "Complete Registration"
                    ) : (
                      "Verify Email & Phone First"
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}