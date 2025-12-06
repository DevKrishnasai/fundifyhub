"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Check, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useDistricts } from "@/hooks/queries"
import { postWithResult } from "@/lib/api-client"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import { PublicHeader } from "@/components/layout/PublicHeader"
import {
  registerSchema,
  otpSchema,
  type UserType,
  ROLES,
  OTP_PURPOSES,
} from "@fundifyhub/types"

const registerFormSchema = registerSchema
  .extend({
    confirmPassword: registerSchema.shape.password,
    emailOtp: otpSchema.optional(),
    phoneOtp: otpSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  })

type RegisterFormValues = {
  firstName: string
  lastName: string
  district: string
  email: string
  phoneNumber: string
  password: string
  confirmPassword: string
  emailOtp?: string | undefined
  phoneOtp?: string | undefined
}

interface RegisterResponse {
  user: UserType
  verificationEmailSent?: boolean
}

interface OtpResponse {
  sessionId: string
  expiresAt?: string
  debugCode?: string
}

export default function RegisterPage() {
  const { login } = useAuth()
  const { data: districts, isLoading: districtsLoading } = useDistricts()
  const [emailSessionId, setEmailSessionId] = useState<string | null>(null)
  const [phoneSessionId, setPhoneSessionId] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      district: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      emailOtp: "",
      phoneOtp: "",
    },
  })

  const sendOtpMutation = useMutation({
    mutationFn: async (payload: { email?: string; phone?: string; purpose: string }) => {
      const res = await postWithResult<OtpResponse>(BACKEND_API_CONFIG.ENDPOINTS.AUTH.SEND_OTP, payload)
      if (!res.ok) {
        throw new Error(res.error.message || "Failed to send OTP")
      }
      return res.data
    },
  })

  const verifyOtpMutation = useMutation({
    mutationFn: async (payload: { sessionId: string; otp: string; purpose: string }) => {
      const res = await postWithResult<{ verified: boolean }>(BACKEND_API_CONFIG.ENDPOINTS.AUTH.VERIFY_OTP, payload)
      if (!res.ok) {
        throw new Error(res.error.message || "Failed to verify OTP")
      }
      return res.data
    },
  })

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterFormValues) => {
      if (!emailSessionId || !phoneSessionId || !emailVerified || !phoneVerified) {
        throw new Error("Please verify both email and phone OTPs before continuing")
      }

      const body = {
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        firstName: payload.firstName,
        lastName: payload.lastName,
        password: payload.password,
        role: ROLES.CUSTOMER,
        districtIds: payload.district ? [payload.district] : [],
        emailSessionId,
        phoneSessionId,
      }

      const res = await postWithResult<RegisterResponse>(BACKEND_API_CONFIG.ENDPOINTS.AUTH.REGISTER, body)
      if (!res.ok) {
        throw new Error(res.error.message || "Registration failed")
      }
      return res.data
    },
  })

  useEffect(() => {
    const subscription = form.watch((_, { name }) => {
      if (name === 'email') {
        setEmailVerified(false)
        setEmailSessionId(null)
        form.setValue('emailOtp', '')
      }
      if (name === 'phoneNumber') {
        setPhoneVerified(false)
        setPhoneSessionId(null)
        form.setValue('phoneOtp', '')
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const onSubmit = (values: RegisterFormValues) => {
    setFormError(null)
    registerMutation.mutate(values, {
      onSuccess: (data) => {
        login(data.user)
      },
      onError: (err: unknown) => setFormError(err instanceof Error ? err.message : 'Registration failed'),
    })
  }

  const handleSendEmailOtp = async () => {
    setFormError(null)
    const email = form.getValues('email')
    const parsed = registerSchema.pick({ email: true }).safeParse({ email })
    if (!parsed.success) {
      setFormError(parsed.error.errors[0]?.message || 'Invalid email')
      return
    }
    try {
      const data = await sendOtpMutation.mutateAsync({ email, purpose: OTP_PURPOSES.REGISTER_EMAIL })
      setEmailSessionId(data.sessionId)
      form.setValue('emailOtp', '')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to send email OTP')
    }
  }

  const handleSendPhoneOtp = async () => {
    setFormError(null)
    const phoneNumber = form.getValues('phoneNumber')
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
      setFormError('Phone must be exactly 10 digits')
      return
    }
    try {
      const data = await sendOtpMutation.mutateAsync({ phone: phoneNumber, purpose: OTP_PURPOSES.REGISTER_PHONE })
      setPhoneSessionId(data.sessionId)
      form.setValue('phoneOtp', '')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to send phone OTP')
    }
  }

  const handleVerifyEmailOtp = async () => {
    const otp = form.getValues('emailOtp')
    if (!emailSessionId || !otp || otp.length !== 6) {
      setFormError('Enter the email OTP to verify')
      return
    }
    try {
      await verifyOtpMutation.mutateAsync({ sessionId: emailSessionId, otp, purpose: OTP_PURPOSES.REGISTER_EMAIL })
      setEmailVerified(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid email OTP')
    }
  }

  const handleVerifyPhoneOtp = async () => {
    const otp = form.getValues('phoneOtp')
    if (!phoneSessionId || !otp || otp.length !== 6) {
      setFormError('Enter the phone OTP to verify')
      return
    }
    try {
      await verifyOtpMutation.mutateAsync({ sessionId: phoneSessionId, otp, purpose: OTP_PURPOSES.REGISTER_PHONE })
      setPhoneVerified(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid phone OTP')
    }
  }

  const districtOptions = useMemo(() => districts ?? [], [districts])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <PublicHeader />
      <div className="flex items-center justify-center p-4 pt-8 sm:pt-12">
        <div className="w-full max-w-3xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-muted-foreground">Verify your email and phone to finish sign up.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account details</CardTitle>
              <CardDescription>We use OTP verification to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formError && (
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="ml-2">{formError}</AlertDescription>
                </Alert>
              )}

              <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" {...form.register('firstName')} />
                    {form.formState.errors.firstName && <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" {...form.register('lastName')} />
                    {form.formState.errors.lastName && <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>District</Label>
                  <Select onValueChange={(val) => form.setValue('district', val)} value={form.watch('district')}>
                    <SelectTrigger>
                      <SelectValue placeholder={districtsLoading ? 'Loading districts...' : 'Select district'} />
                    </SelectTrigger>
                    <SelectContent>
                      {districtOptions.map((district) => (
                        <SelectItem key={district.id} value={district.id}>{district.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.district && <p className="text-sm text-destructive">{form.formState.errors.district.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="flex items-center gap-2">
                      <Input type="email" placeholder="you@example.com" {...form.register('email')} />
                      <Button type="button" variant="outline" onClick={handleSendEmailOtp} disabled={sendOtpMutation.isPending}>
                        {sendOtpMutation.isPending ? 'Sending' : 'Send OTP'}
                      </Button>
                    </div>
                    {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                    {emailVerified && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Email verified
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Phone number</Label>
                    <div className="flex items-center gap-2">
                      <Input type="tel" placeholder="9876543210" {...form.register('phoneNumber')} />
                      <Button type="button" variant="outline" onClick={handleSendPhoneOtp} disabled={sendOtpMutation.isPending}>
                        {sendOtpMutation.isPending ? 'Sending' : 'Send OTP'}
                      </Button>
                    </div>
                    {form.formState.errors.phoneNumber && <p className="text-sm text-destructive">{form.formState.errors.phoneNumber.message}</p>}
                    {phoneVerified && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Phone verified
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email OTP</Label>
                    <div className="flex items-center gap-2">
                      <Input maxLength={6} placeholder="123456" {...form.register('emailOtp')} />
                      <Button type="button" variant="secondary" onClick={handleVerifyEmailOtp} disabled={verifyOtpMutation.isPending || emailVerified}>
                        {verifyOtpMutation.isPending ? 'Verifying' : 'Verify'}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone OTP</Label>
                    <div className="flex items-center gap-2">
                      <Input maxLength={6} placeholder="123456" {...form.register('phoneOtp')} />
                      <Button type="button" variant="secondary" onClick={handleVerifyPhoneOtp} disabled={verifyOtpMutation.isPending || phoneVerified}>
                        {verifyOtpMutation.isPending ? 'Verifying' : 'Verify'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="flex items-center gap-2">
                      <Input type={showPassword ? 'text' : 'password'} placeholder="Create a password" {...form.register('password')} />
                      <Button type="button" variant="ghost" onClick={() => setShowPassword((v) => !v)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm password</Label>
                    <div className="flex items-center gap-2">
                      <Input type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password" {...form.register('confirmPassword')} />
                      <Button type="button" variant="ghost" onClick={() => setShowConfirm((v) => !v)}>
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {form.formState.errors.confirmPassword && <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={registerMutation.isPending || !emailVerified || !phoneVerified}>
                  {registerMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <Spinner size="sm" />
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    'Create account'
                  )}
                </Button>
              </form>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
