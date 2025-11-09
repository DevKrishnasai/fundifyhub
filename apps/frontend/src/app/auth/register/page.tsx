"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import toast from '@/lib/toast'
import { Eye, EyeOff, CreditCard, User, Mail, Phone, Lock, ChevronRight, ChevronLeft, Check, X, CheckCircle } from "lucide-react"
import { DISTRICTS } from '@fundifyhub/types'
import { post, postWithResult } from '@/lib/api-client'
import { BACKEND_API_CONFIG } from '@/lib/urls'
import { z } from 'zod';
import { sanitizePhone, isValidPhone } from '@/lib/phone'

export default function RegisterPage() {
  const router = useRouter()
  
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
    district: "",
    password: "",
    confirmPassword: "",
  })
  // per-field errors for step1
  const [step1Errors, setStep1Errors] = useState<{ [k: string]: string }>({})
  
  // Step 2 form data
  const [step2Data, setStep2Data] = useState({
    email: "",
    phoneNumber: "",
    emailOTP: "",
    phoneOTP: "",
    emailSessionId: "", // Store sessionId from send-otp
    phoneSessionId: "", // Store sessionId from send-otp
  })
  // server-side field errors returned from API (e.g. { email: 'already used' })
  const [serverFieldErrors, setServerFieldErrors] = useState<{ [k: string]: string }>({})
  
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
  const [otpErrors, setOtpErrors] = useState({ email: '', phone: '' })
  const [resendCooldown, setResendCooldown] = useState({ email: 0, phone: 0 })

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

  // Replace validateStep1 with Zod validation
  const validateStep1 = () => {
    const errs: { [k: string]: string } = {}
    if (!step1Data.firstName.trim()) errs.firstName = 'First name is required'
    if (!step1Data.lastName.trim()) errs.lastName = 'Last name is required'
    if (!step1Data.district) errs.district = 'Please select your district'
    if (step1Data.password.length < 8) errs.password = 'Password must be at least 8 characters long'
    const { strength } = getPasswordStrength(step1Data.password)
    if (step1Data.password && strength < 3) errs.password = 'Password is too weak. Include uppercase, lowercase, numbers and a special character.'
    if (step1Data.password !== step1Data.confirmPassword) errs.confirmPassword = 'Passwords do not match'

    setStep1Errors(errs)
    setError(Object.values(errs)[0] || '')
    // clear any server-side field errors when re-validating locally
    setServerFieldErrors({})
    return Object.keys(errs).length === 0
  }

  // quick readiness check to enable the Next button (doesn't set errors)
  const isStep1Ready = () => {
    const { firstName, lastName, district, password, confirmPassword } = step1Data
    if (!firstName.trim() || !lastName.trim() || !district) return false
    if (password.length < 8) return false
    if (password !== confirmPassword) return false
    const { strength } = getPasswordStrength(password)
    return strength >= 3
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
    if (!cleanPhone || cleanPhone.length !== 10) {
      setPhoneValidation({ isValid: false, isChecking: false, error: "Phone must be exactly 10 digits" })
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

  // Send OTP for email
  const sendEmailOTP = async () => {
    setOtpLoading(prev => ({ ...prev, email: true }))
    
    try {
      const res = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.AUTH.SEND_OTP, { email: step2Data.email })

      if (res.ok) {
        setEmailOTPSent(true)
        // Store sessionId for verification (postWithResult returns unwrapped `data`)
        setStep2Data(prev => ({ ...prev, emailSessionId: res.data.sessionId }))
        toast.success("Email OTP sent! Verification code sent to your email.")
        // start resend cooldown
        setResendCooldown(prev => ({ ...prev, email: 60 }))
      } else {
        // surface field errors if present
        if (res.error?.fieldErrors) setServerFieldErrors(prev => ({ ...prev, ...res.error.fieldErrors }))
        // If backend returned retryAfterMs, surface it and set a cooldown
        if (res.error?.retryAfterMs) {
          const secs = Math.ceil(res.error.retryAfterMs / 1000)
          setResendCooldown(prev => ({ ...prev, email: secs }))
          toast.error(res.error?.message ? `Rate limit exceeded. Try again in ${secs}s` : `Rate limit exceeded. Try again in ${secs}s`)
        } else {
          toast.error(res.error?.message ? `Failed to send email OTP: ${res.error.message}` : "Failed to send email OTP.")
        }
      }
    } catch (error) {
      toast.error("Network error: Unable to send email OTP. Please try again.")
    } finally {
      setOtpLoading(prev => ({ ...prev, email: false }))
    }
  }

  // Send OTP for phone
  const sendPhoneOTP = async () => {
    setOtpLoading(prev => ({ ...prev, phone: true }))
    
    try {
      const res = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.AUTH.SEND_OTP, { phone: step2Data.phoneNumber })

      if (res.ok) {
        setPhoneOTPSent(true)
        // Store sessionId for verification (postWithResult returns unwrapped `data`)
        setStep2Data(prev => ({ ...prev, phoneSessionId: res.data.sessionId }))
        toast.success("Phone OTP sent! Verification code sent to your phone.")
        // start resend cooldown
        setResendCooldown(prev => ({ ...prev, phone: 60 }))
      } else {
        if (res.error?.fieldErrors) setServerFieldErrors(prev => ({ ...prev, ...res.error.fieldErrors }))
        if (res.error?.retryAfterMs) {
          const secs = Math.ceil(res.error.retryAfterMs / 1000)
          setResendCooldown(prev => ({ ...prev, phone: secs }))
          toast.error(res.error?.message ? `Rate limit exceeded. Try again in ${secs}s` : `Rate limit exceeded. Try again in ${secs}s`)
        } else {
          toast.error(res.error?.message ? `Failed to send phone OTP: ${res.error.message}` : "Failed to send phone OTP.")
        }
      }
    } catch (error) {
      toast.error("Network error: Unable to send phone OTP. Please try again.")
    } finally {
      setOtpLoading(prev => ({ ...prev, phone: false }))
    }
  }

  // Verify individual OTP
  const verifyOTP = async (type: 'EMAIL' | 'PHONE') => {
    const otp = type === 'EMAIL' ? step2Data.emailOTP : step2Data.phoneOTP;
    const sessionId = type === 'EMAIL' ? step2Data.emailSessionId : step2Data.phoneSessionId;
    // clear previous otp error for this type
    setOtpErrors(prev => ({ ...prev, [type.toLowerCase()]: '' }))
    
    if (!sessionId) {
      toast.error("Error: Please send OTP first.")
      return
    }

    if (otp.length !== 6) {
      toast.error("Invalid OTP: Please enter a valid 6-digit OTP.")
      return
    }

    setVerifyLoading(prev => ({ 
      ...prev, 
      [type.toLowerCase()]: true 
    }))
    
    try {
      const res = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.AUTH.VERIFY_OTP, { sessionId, otp })

      if (res.ok) {
        if (type === 'EMAIL') {
          setEmailVerified(true)
        } else {
          setPhoneVerified(true)
        }

        toast.success(`${type.toLowerCase()} verified! ${res.data.message || ''}`)
        // clear any otp error
        setOtpErrors(prev => ({ ...prev, [type.toLowerCase()]: '' }))
      } else {
        const msg = res.error?.message || 'Verification failed.'
        // show field-level errors if present
        if (res.error?.fieldErrors) setServerFieldErrors(prev => ({ ...prev, ...res.error.fieldErrors }))
        // If server provided retry info, show time until retry
        if (res.error?.retryAfterMs) {
          const secs = Math.ceil(res.error.retryAfterMs / 1000)
          const retryMsg = `${msg} Try again in ${secs}s.`
          setOtpErrors(prev => ({ ...prev, [type.toLowerCase()]: retryMsg }))
          toast.error(retryMsg)
        } else {
          setOtpErrors(prev => ({ ...prev, [type.toLowerCase()]: msg }))
          toast.error(msg)
        }
      }
    } catch (error) {
      const msg = "Network error: Unable to verify OTP. Please try again."
      setOtpErrors(prev => ({ ...prev, [type.toLowerCase()]: msg }))
      toast.error(msg)
    } finally {
      setVerifyLoading(prev => ({ 
        ...prev, 
        [type.toLowerCase()]: false 
      }))
    }
  }

  // Resend OTP (reuses send-otp endpoint)
  const resendOTP = async (type: 'EMAIL' | 'PHONE') => {
    setResendLoading(prev => ({ 
      ...prev, 
      [type.toLowerCase()]: true 
    }))
    
    try {
      const res = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.AUTH.SEND_OTP,
        type === 'EMAIL' ? { email: step2Data.email } : { phone: step2Data.phoneNumber }
      )

      if (res.ok) {
        // Clear the OTP input and store new sessionId (postWithResult returns unwrapped `data`)
        if (type === 'EMAIL') {
          setStep2Data(prev => ({ ...prev, emailOTP: '', emailSessionId: res.data.sessionId }))
        } else {
          setStep2Data(prev => ({ ...prev, phoneOTP: '', phoneSessionId: res.data.sessionId }))
        }

        toast.success(`OTP resent! Verification code sent to your ${type.toLowerCase()}`)
        // restart cooldown
        setResendCooldown(prev => ({ ...prev, [type.toLowerCase()]: 60 }))
      } else {
        if (res.error?.fieldErrors) setServerFieldErrors(prev => ({ ...prev, ...res.error.fieldErrors }))
        if (res.error?.retryAfterMs) {
          const secs = Math.ceil(res.error.retryAfterMs / 1000)
          // set global resend cooldown for the appropriate type
          setResendCooldown(prev => ({ ...prev, [type.toLowerCase()]: secs }))
          toast.error(res.error?.message ? `Rate limit exceeded. Try again in ${secs}s` : `Rate limit exceeded. Try again in ${secs}s`)
        } else {
          toast.error(res.error?.message ? `Failed to resend OTP: ${res.error.message}` : "Failed to resend OTP.")
        }
      }
    } catch (error) {
      toast.error("Network error: Unable to resend OTP. Please try again.")
    } finally {
      setResendLoading(prev => ({ 
        ...prev, 
        [type.toLowerCase()]: false 
      }))
    }
  }

  // Countdown timers for resend cooldowns
  useEffect(() => {
    let emailTimer: NodeJS.Timeout | null = null
    if (resendCooldown.email > 0) {
      emailTimer = setInterval(() => {
        setResendCooldown(prev => ({ ...prev, email: Math.max(0, prev.email - 1) }))
      }, 1000)
    }
    return () => { if (emailTimer) clearInterval(emailTimer) }
  }, [resendCooldown.email])

  useEffect(() => {
    let phoneTimer: NodeJS.Timeout | null = null
    if (resendCooldown.phone > 0) {
      phoneTimer = setInterval(() => {
        setResendCooldown(prev => ({ ...prev, phone: Math.max(0, prev.phone - 1) }))
      }, 1000)
    }
    return () => { if (phoneTimer) clearInterval(phoneTimer) }
  }, [resendCooldown.phone])

  // use shared phone validation from packages/types via helpers

  // Complete registration after both OTPs are verified
  const completeRegistration = async () => {
    if (!emailVerified || !phoneVerified) {
      toast.error("Verification required: Please verify both email and phone before proceeding.")
      return
    }

    setIsLoading(true)
    
    try {
      // Use the verified contact methods for registration
      const res = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.AUTH.REGISTER, {
        email: step2Data.email,
        phoneNumber: step2Data.phoneNumber,
        firstName: step1Data.firstName,
        lastName: step1Data.lastName,
        district: step1Data.district,
        password: step1Data.password,
      })

      if (res.ok) {
        // postWithResult may return the unwrapped `data` (when the backend used { data })
        // or the full payload when there is no `data` key. Handle both shapes.
        const serverPayload = res.data as any;
        const user = serverPayload?.user ?? serverPayload?.data?.user;
        // defensive: if user missing, treat as error
        if (!user) {
          throw new Error('Registration succeeded but response missing user payload')
        }
        const safeUser = { ...user, roles: Array.isArray(user.roles) ? user.roles : ['CUSTOMER'] };
        toast.success("Registration successful! Your account has been created successfully.")
        // Optionally, update auth context if needed
        router.push('/dashboard')
      } else {
        // If backend provided field-level errors, show them under the inputs
        if (res.error?.fieldErrors && Object.keys(res.error.fieldErrors).length > 0) {
          setServerFieldErrors(res.error.fieldErrors)
          setError(res.error.message || 'Registration failed. Please correct the highlighted fields.')
        } else {
          setError(res.error?.message || "Registration failed. Please try again.")
          toast.error(res.error?.message ? `Registration failed: ${res.error.message}` : "Registration failed. Please try again.")
        }
      }
    } catch (error) {
      setError("Network error. Please check your connection and try again.")
      toast.error("Network error: Unable to complete registration. Please try again.")
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
      // pre-validate phone before backend check
      if (!isValidPhone(step2Data.phoneNumber)) {
        setPhoneValidation({ isValid: false, isChecking: false, error: 'Phone must be exactly 10 digits' })
        return
      }

      const timeout = setTimeout(() => checkPhoneExists(step2Data.phoneNumber), 500)
      return () => clearTimeout(timeout)
    }
  }, [step2Data.phoneNumber])

  const { strength: passwordStrength, checks: passwordChecks } = getPasswordStrength(step1Data.password)

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
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
                      {(step1Errors.firstName || serverFieldErrors.firstName) && (
                        <p className="text-sm text-red-600">{serverFieldErrors.firstName || step1Errors.firstName}</p>
                      )}
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
                      {(step1Errors.lastName || serverFieldErrors.lastName) && (
                        <p className="text-sm text-red-600">{serverFieldErrors.lastName || step1Errors.lastName}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Select value={step1Data.district} onValueChange={(val) => setStep1Data(prev => ({ ...prev, district: val }))}>
                    <SelectTrigger aria-label="Select district" className="w-full">
                      <SelectValue placeholder="Select your district" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRICTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                    {(step1Errors.district || serverFieldErrors.district) && <p className="text-sm text-red-600">{serverFieldErrors.district || step1Errors.district}</p>}
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
                      {(step1Errors.password || serverFieldErrors.password) && (
                        <p className="text-sm text-red-600 mt-2">{serverFieldErrors.password || step1Errors.password}</p>
                      )}
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
                  {step1Errors.confirmPassword && (
                    <p className="text-sm text-red-600">{step1Errors.confirmPassword}</p>
                  )}
                  {serverFieldErrors.confirmPassword && (
                    <p className="text-sm text-red-600">{serverFieldErrors.confirmPassword}</p>
                  )}
                </div>
                <Button onClick={nextStep} className="w-full" size="lg" disabled={!isStep1Ready()}>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Contact Information & Verification */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Contact Information Section (single column stacked) */}
                <div className="space-y-6">
                  {/* Email Card */}
                  <div className="border rounded-lg p-4 bg-background/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">Email</div>
                          <div className="text-xs text-muted-foreground">Used for account recovery and notifications</div>
                        </div>
                      </div>
                      {emailVerified ? (
                        <div className="text-sm text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Verified</div>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={step2Data.email}
                        onChange={(e) => {
                          setStep2Data(prev => ({ ...prev, email: e.target.value }))
                          // clear server error for email on change
                          setServerFieldErrors(prev => ({ ...prev, email: '' }))
                        }}
                        className={`w-full ${emailValidation.error ? 'border-red-500' : emailValidation.isValid ? 'border-green-500' : ''}`}
                        disabled={emailOTPSent || emailVerified}
                      />
                      {/* Action area: show availability + controls or a simple verified view */}
                      {emailVerified ? (
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-green-600 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" /> Verified
                          </div>
                          <div className="text-sm text-muted-foreground truncate" title={step2Data.email}>{step2Data.email}</div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            {emailValidation.isChecking ? 'Checking availability...' : emailValidation.error || (emailValidation.isValid ? 'Email looks good' : 'Enter your email')}
                          </div>
                          {serverFieldErrors.email && (
                            <p className="text-sm text-red-600">{serverFieldErrors.email}</p>
                          )}
                          <div className="flex items-center space-x-2">
                            {emailValidation.isChecking ? (<Spinner size="sm" />) : emailValidation.isValid ? (<Check className="w-4 h-4 text-green-500" />) : emailValidation.error ? (<X className="w-4 h-4 text-red-500" />) : null}
                            {!emailOTPSent ? (
                              <Button size="sm" onClick={sendEmailOTP} disabled={!canSendEmailOTP() || otpLoading.email}>
                                {otpLoading.email ? <Spinner size="sm" /> : 'Send OTP'}
                              </Button>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Button size="sm" onClick={() => verifyOTP('EMAIL')} disabled={!canVerifyEmailOTP() || verifyLoading.email}>
                                  {verifyLoading.email ? <Spinner size="sm" /> : 'Verify'}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => resendOTP('EMAIL')} disabled={resendLoading.email || (resendCooldown.email > 0 && !emailVerified)}>
                                  {resendLoading.email ? <Spinner size="sm" /> : (resendCooldown.email > 0 && !emailVerified ? `Resend (${resendCooldown.email}s)` : 'Resend')}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {emailOTPSent && !emailVerified && (
                        <div className="mt-2">
                          <Input
                            id="emailOTP"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            placeholder="Enter 6-digit code"
                            value={step2Data.emailOTP}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0,6)
                              setStep2Data(prev => ({ ...prev, emailOTP: digits }))
                            }}
                          />
                          {otpErrors.email && <p className="text-sm text-red-600 mt-1">{otpErrors.email}</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phone Card */}
                  <div className="border rounded-lg p-4 bg-background/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">Phone</div>
                          <div className="text-xs text-muted-foreground">Used for OTP verification and SMS alerts</div>
                        </div>
                      </div>
                      {phoneVerified ? (
                        <div className="text-sm text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Verified</div>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="1234567890"
                        value={step2Data.phoneNumber}
                        onChange={(e) => {
                          const cleaned = sanitizePhone(e.target.value)
                          setStep2Data(prev => ({ ...prev, phoneNumber: cleaned }))
                          // clear server error for phone on change
                          setServerFieldErrors(prev => ({ ...prev, phoneNumber: '' }))
                        }}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        className={`w-full ${phoneValidation.error ? 'border-red-500' : phoneValidation.isValid ? 'border-green-500' : ''}`}
                        disabled={phoneOTPSent || phoneVerified}
                      />
                      {phoneVerified ? (
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-green-600 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" /> Verified
                          </div>
                          <div className="text-sm text-muted-foreground truncate" title={step2Data.phoneNumber}>{step2Data.phoneNumber}</div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            {phoneValidation.isChecking ? 'Checking availability...' : phoneValidation.error || (phoneValidation.isValid ? 'Phone looks good' : 'Enter your phone number')}
                          </div>
                          {serverFieldErrors.phoneNumber && (
                            <p className="text-sm text-red-600">{serverFieldErrors.phoneNumber}</p>
                          )}
                          <div className="flex items-center space-x-2">
                            {phoneValidation.isChecking ? (<Spinner size="sm" />) : phoneValidation.isValid ? (<Check className="w-4 h-4 text-green-500" />) : phoneValidation.error ? (<X className="w-4 h-4 text-red-500" />) : null}
                            {!phoneOTPSent ? (
                              <Button size="sm" onClick={sendPhoneOTP} disabled={!canSendPhoneOTP() || otpLoading.phone}>
                                {otpLoading.phone ? <Spinner size="sm" /> : 'Send OTP'}
                              </Button>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Button size="sm" onClick={() => verifyOTP('PHONE')} disabled={!canVerifyPhoneOTP() || verifyLoading.phone}>
                                  {verifyLoading.phone ? <Spinner size="sm" /> : 'Verify'}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => resendOTP('PHONE')} disabled={resendLoading.phone || (resendCooldown.phone > 0 && !phoneVerified)}>
                                  {resendLoading.phone ? <Spinner size="sm" /> : (resendCooldown.phone > 0 && !phoneVerified ? `Resend (${resendCooldown.phone}s)` : 'Resend')}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {phoneOTPSent && !phoneVerified && (
                        <div className="mt-2">
                          <Input
                            id="phoneOTP"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            placeholder="Enter 6-digit code"
                            value={step2Data.phoneOTP}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0,6)
                              setStep2Data(prev => ({ ...prev, phoneOTP: digits }))
                            }}
                          />
                          {otpErrors.phone && <p className="text-sm text-red-600 mt-1">{otpErrors.phone}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* OTP controls are integrated into the Email/Phone cards above. */}

                {/* Terms checkbox + Navigation Buttons */}
                <div className="mt-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="acceptTerms"
                      checked={acceptTerms}
                      onCheckedChange={(val) => setAcceptTerms(Boolean(val))}
                      disabled={!(emailVerified && phoneVerified)}
                    />
                    <div className="text-sm">
                      <Label htmlFor="acceptTerms" className="mb-0">
                        I agree to the <a href="/terms" className="text-primary hover:underline">Terms of Service</a> and <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                      </Label>
                      {!(emailVerified && phoneVerified) && (
                        <p className="text-xs text-muted-foreground">Verify both email and phone to enable this checkbox.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
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
                {/* bottom back to login removed to keep flow focused */}
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
