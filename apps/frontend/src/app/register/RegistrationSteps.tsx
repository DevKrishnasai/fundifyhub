"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { 
  User, Mail, Phone, FileText, CheckCircle, 
  ArrowRight, ArrowLeft, AlertCircle 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { useDistricts } from "@/hooks/queries"
import { postWithResult } from "@/lib/api-client"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import { useAuth } from "@/contexts/AuthContext"
import { UploadDropzone } from "@/components/uploadthing-components"
import {
  registerSchema,
  otpSchema,
  OTP_PURPOSES,
  type UserType,
} from "@fundifyhub/types"
import { z } from "zod"

// Step 1: Basic Details Schema
const basicDetailsSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  district: z.string().min(1, "Please select a district"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().regex(/^[0-9]{10}$/, "Phone must be 10 digits"),
})

// Step 2: Verification Schema
const verificationSchema = z.object({
  emailOtp: z.string().length(6, "OTP must be 6 digits"),
  phoneOtp: z.string().length(6, "OTP must be 6 digits"),
})

// Step 3: Password & ID Proof Schema
const finalStepSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  idProofType: z.enum(["AADHAAR", "PAN", "PASSPORT", "DRIVING_LICENSE"]),
  idProofNumber: z.string().min(5, "Please enter valid ID proof number"),
  idProofFileKey: z.string().min(1, "Please upload your ID proof"),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords must match",
})

function evaluatePasswordStrength(value: string): { score: number; label: string } {
  let score = 0
  if (value.length >= 8) score++
  if (value.length >= 12) score++
  if (/[A-Z]/.test(value)) score++
  if (/[0-9]/.test(value)) score++
  if (/[^A-Za-z0-9]/.test(value)) score++

  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong", "Very strong"]
  return {
    score: Math.min(score, 5),
    label: labels[Math.min(score, 5)],
  }
}

type BasicDetails = z.infer<typeof basicDetailsSchema>
type Verification = z.infer<typeof verificationSchema>
type FinalStep = z.infer<typeof finalStepSchema>

interface OtpResponse {
  sessionId: string
  expiresAt?: string
  debugCode?: string
}

interface RegisterResponse {
  user: UserType
}

const steps = [
  { id: 1, name: "Basic Details", icon: User },
  { id: 2, name: "Verification", icon: CheckCircle },
  { id: 3, name: "ID Proof & Password", icon: FileText },
]

export function RegistrationSteps() {
  const router = useRouter()
  const { login } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Step data
  const [basicDetails, setBasicDetails] = useState<BasicDetails | null>(null)
  const [verification, setVerification] = useState<Verification | null>(null)
  
  // OTP states
  const [emailSessionId, setEmailSessionId] = useState<string | null>(null)
  const [phoneSessionId, setPhoneSessionId] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle")
  const [passwordStrength, setPasswordStrength] = useState<{score: number; label: string}>({ score: 0, label: "Too weak" })
  
  // Districts query
  const { data: districts, isLoading: districtsLoading } = useDistricts()

  // Progress calculation
  const progress = (currentStep / steps.length) * 100

  // Forms for each step
  const basicForm = useForm<BasicDetails>({
    resolver: zodResolver(basicDetailsSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      district: "",
      email: "",
      phoneNumber: "",
    },
  })

  const verificationForm = useForm<Verification>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      emailOtp: "",
      phoneOtp: "",
    },
  })

  const finalForm = useForm<FinalStep>({
    resolver: zodResolver(finalStepSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      idProofType: "AADHAAR",
      idProofNumber: "",
      idProofFileKey: "",
    },
  })

  const passwordValue = finalForm.watch("password")

  // Update password strength indicator
  useEffect(() => {
    setPasswordStrength(evaluatePasswordStrength(passwordValue || ""))
  }, [passwordValue])

  // Mutations
  const sendOtpMutation = useMutation({
    mutationFn: async (payload: { email?: string; phone?: string; purpose: string }) => {
      const result = await postWithResult<OtpResponse>(
        BACKEND_API_CONFIG.ENDPOINTS.AUTH.SEND_OTP,
        payload
      )
      if (!result.ok) throw new Error(result.error.message || "Failed to send OTP")
      return result.data
    },
  })

  const verifyOtpMutation = useMutation({
    mutationFn: async (payload: { sessionId: string; otp: string; purpose: string }) => {
      const result = await postWithResult(
        BACKEND_API_CONFIG.ENDPOINTS.AUTH.VERIFY_OTP,
        payload
      )
      if (!result.ok) throw new Error(result.error.message || "Invalid OTP")
      return result.data
    },
  })

  const registerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const result = await postWithResult<RegisterResponse>(
        BACKEND_API_CONFIG.ENDPOINTS.AUTH.REGISTER,
        payload
      )
      if (!result.ok) throw new Error(result.error.message || "Registration failed")
      return result.data
    },
    onSuccess: (data) => {
      login(data.user)
      router.push("/dashboard")
    },
  })

  // Step 1: Send OTPs
  const handleSendEmailOtp = async () => {
    if (!basicDetails) return
    try {
      const data = await sendOtpMutation.mutateAsync({
        email: basicDetails.email,
        purpose: OTP_PURPOSES.REGISTER_EMAIL,
      })
      setEmailSessionId(data.sessionId)
      setFormError(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to send email OTP")
    }
  }

  const handleSendPhoneOtp = async () => {
    if (!basicDetails) return
    try {
      const data = await sendOtpMutation.mutateAsync({
        phone: basicDetails.phoneNumber,
        purpose: OTP_PURPOSES.REGISTER_PHONE,
      })
      setPhoneSessionId(data.sessionId)
      setFormError(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to send phone OTP")
    }
  }

  // Step 2: Verify OTPs
  const handleVerifyEmailOtp = async () => {
    const otp = verificationForm.getValues("emailOtp")
    if (!emailSessionId || !otp) return
    try {
      await verifyOtpMutation.mutateAsync({
        sessionId: emailSessionId,
        otp,
        purpose: OTP_PURPOSES.REGISTER_EMAIL,
      })
      setEmailVerified(true)
      setFormError(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Invalid email OTP")
    }
  }

  const handleVerifyPhoneOtp = async () => {
    const otp = verificationForm.getValues("phoneOtp")
    if (!phoneSessionId || !otp) return
    try {
      await verifyOtpMutation.mutateAsync({
        sessionId: phoneSessionId,
        otp,
        purpose: OTP_PURPOSES.REGISTER_PHONE,
      })
      setPhoneVerified(true)
      setFormError(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Invalid phone OTP")
    }
  }

  // Navigation handlers
  const handleStep1Next = async (data: BasicDetails) => {
    setBasicDetails(data)
    setCurrentStep(2)
    setFormError(null)
  }

  const handleStep2Next = async (data: Verification) => {
    if (!emailVerified || !phoneVerified) {
      setFormError("Please verify both email and phone before continuing")
      return
    }
    setVerification(data)
    setCurrentStep(3)
    setFormError(null)
  }

  const handleStep3Submit = async (data: FinalStep) => {
    if (!basicDetails || !verification) return

    try {
      // TODO: Upload ID proof document to storage
      // const idProofUrl = await uploadIdProof(data.idProofDocument)

      await registerMutation.mutateAsync({
        email: basicDetails.email,
        phoneNumber: basicDetails.phoneNumber,
        firstName: basicDetails.firstName,
        lastName: basicDetails.lastName,
        password: data.password,
        districtIds: [basicDetails.district],
        emailSessionId: emailSessionId,
        phoneSessionId: phoneSessionId,
        idProofType: data.idProofType,
        idProofNumber: data.idProofNumber,
        idProofDocumentUrl: data.idProofFileKey,
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed")
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep} of {steps.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicator */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const StepIcon = step.icon
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center flex-1 ${
                index !== steps.length - 1 ? "relative" : ""
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isActive
                    ? "bg-background border-primary text-primary"
                    : "bg-background border-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <StepIcon className="h-6 w-6" />
                )}
              </div>
              <span
                className={`mt-2 text-xs sm:text-sm font-medium ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.name}
              </span>
              {index !== steps.length - 1 && (
                <div
                  className={`absolute top-6 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-0.5 ${
                    isCompleted ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Error Alert */}
      {formError && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{formError}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <Card>
        {/* Step 1: Basic Details */}
        {currentStep === 1 && (
          <>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Let's start with your basic details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={basicForm.handleSubmit(handleStep1Next)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      {...basicForm.register("firstName")}
                    />
                    {basicForm.formState.errors.firstName && (
                      <p className="text-sm text-destructive">
                        {basicForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      {...basicForm.register("lastName")}
                    />
                    {basicForm.formState.errors.lastName && (
                      <p className="text-sm text-destructive">
                        {basicForm.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>District</Label>
                  <Select
                    onValueChange={(val) => basicForm.setValue("district", val)}
                    value={basicForm.watch("district")}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          districtsLoading ? "Loading districts..." : "Select your district"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {districts?.map((district) => (
                        <SelectItem key={district.id} value={district.id}>
                          {district.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {basicForm.formState.errors.district && (
                    <p className="text-sm text-destructive">
                      {basicForm.formState.errors.district.message}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    disabled={!!emailSessionId || emailVerified}
                    {...basicForm.register("email")}
                  />
                  {basicForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {basicForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    disabled={!!phoneSessionId || phoneVerified}
                    {...basicForm.register("phoneNumber")}
                  />
                  {basicForm.formState.errors.phoneNumber && (
                    <p className="text-sm text-destructive">
                      {basicForm.formState.errors.phoneNumber.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full">
                  Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* Step 2: Verification */}
        {currentStep === 2 && basicDetails && (
          <>
            <CardHeader>
              <CardTitle>Verify Your Contact Information</CardTitle>
              <CardDescription>
                We've sent OTP codes to verify your email and phone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={verificationForm.handleSubmit(handleStep2Next)}
                className="space-y-6"
              >
                {/* Email Verification */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-base">Email Verification</Label>
                        <p className="text-sm text-muted-foreground">{basicDetails.email}</p>
                      </div>
                    </div>
                    {emailVerified && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  {!emailSessionId ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendEmailOtp}
                      disabled={sendOtpMutation.isPending}
                      className="w-full"
                    >
                      {sendOtpMutation.isPending ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Sending...
                        </>
                      ) : (
                        "Send Email OTP"
                      )}
                    </Button>
                  ) : !emailVerified ? (
                    <div className="space-y-2">
                      <Label htmlFor="emailOtp">Enter OTP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="emailOtp"
                          placeholder="123456"
                          maxLength={6}
                          {...verificationForm.register("emailOtp")}
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyEmailOtp}
                          disabled={verifyOtpMutation.isPending}
                        >
                          {verifyOtpMutation.isPending ? "Verifying..." : "Verify"}
                        </Button>
                      </div>
                      {verificationForm.formState.errors.emailOtp && (
                        <p className="text-sm text-destructive">
                          {verificationForm.formState.errors.emailOtp.message}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Phone Verification */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-base">Phone Verification</Label>
                        <p className="text-sm text-muted-foreground">{basicDetails.phoneNumber}</p>
                      </div>
                    </div>
                    {phoneVerified && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  {!phoneSessionId ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendPhoneOtp}
                      disabled={sendOtpMutation.isPending}
                      className="w-full"
                    >
                      {sendOtpMutation.isPending ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Sending...
                        </>
                      ) : (
                        "Send Phone OTP"
                      )}
                    </Button>
                  ) : !phoneVerified ? (
                    <div className="space-y-2">
                      <Label htmlFor="phoneOtp">Enter OTP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="phoneOtp"
                          placeholder="123456"
                          maxLength={6}
                          {...verificationForm.register("phoneOtp")}
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyPhoneOtp}
                          disabled={verifyOtpMutation.isPending}
                        >
                          {verifyOtpMutation.isPending ? "Verifying..." : "Verify"}
                        </Button>
                      </div>
                      {verificationForm.formState.errors.phoneOtp && (
                        <p className="text-sm text-destructive">
                          {verificationForm.formState.errors.phoneOtp.message}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={!emailVerified || !phoneVerified}
                    className="flex-1"
                  >
                    Next Step <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}

        {/* Step 3: ID Proof & Password */}
        {currentStep === 3 && basicDetails && verification && (
          <>
            <CardHeader>
              <CardTitle>Final Step</CardTitle>
              <CardDescription>
                Upload your ID proof and create a secure password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={finalForm.handleSubmit(handleStep3Submit)} className="space-y-4">
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="idProofType">ID Type</Label>
                    <Select
                      onValueChange={(val: any) => finalForm.setValue("idProofType", val)}
                      value={finalForm.watch("idProofType")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AADHAAR">Aadhaar Card</SelectItem>
                        <SelectItem value="PAN">PAN Card</SelectItem>
                        <SelectItem value="PASSPORT">Passport</SelectItem>
                        <SelectItem value="DRIVING_LICENSE">Driving License</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idProofNumber">ID Number</Label>
                    <Input
                      id="idProofNumber"
                      placeholder="Enter ID proof number"
                      {...finalForm.register("idProofNumber")}
                    />
                    {finalForm.formState.errors.idProofNumber && (
                      <p className="text-sm text-destructive">
                        {finalForm.formState.errors.idProofNumber.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label>Upload ID Proof</Label>
                    <UploadDropzone
                      endpoint="requestDocument"
                      content={{
                        label: uploadStatus === "uploading" ? "Uploading..." : undefined,
                      }}
                      onUploadBegin={() => {
                        setUploadStatus("uploading")
                        setUploadError(null)
                      }}
                      onClientUploadComplete={(files) => {
                        const file = files?.[0];
                        const key = (file as any)?.serverData?.fileKey || (file as any)?.key;
                        const name = (file as any)?.serverData?.fileName || (file as any)?.name;

                        if (key) {
                          finalForm.setValue("idProofFileKey", key, { shouldValidate: true });
                          setUploadedFileName(name || "Uploaded file");
                          setUploadStatus("done")
                          setUploadError(null);
                          finalForm.clearErrors("idProofFileKey");
                        }
                      }}
                      onUploadError={(error) => {
                        setUploadStatus("error")
                        setUploadError(error.message);
                        finalForm.setValue("idProofFileKey", "");
                      }}
                    />
                    {uploadedFileName && (
                      <p className="text-sm text-muted-foreground">Uploaded: {uploadedFileName}</p>
                    )}
                    {uploadError && (
                      <p className="text-sm text-destructive">{uploadError}</p>
                    )}
                    {uploadStatus === "uploading" && (
                      <p className="text-sm text-muted-foreground">Uploading... please wait</p>
                    )}
                    {finalForm.formState.errors.idProofFileKey && (
                      <p className="text-sm text-destructive">
                        {finalForm.formState.errors.idProofFileKey.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload a clear photo or PDF. Files are stored securely and require verification.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    {...finalForm.register("password")}
                  />
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[0,1,2,3,4].map((idx) => (
                        <div
                          key={idx}
                          className={`h-1 flex-1 rounded ${idx <= passwordStrength.score - 1 ? "bg-primary" : "bg-muted"}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Strength: {passwordStrength.label}</p>
                  </div>
                  {finalForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {finalForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    {...finalForm.register("confirmPassword")}
                  />
                  {finalForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {finalForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="ml-2 text-sm text-blue-800 dark:text-blue-300">
                    Your account will be created with verification pending. An admin will verify
                    your documents before you can create loan requests.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="flex-1"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account <CheckCircle className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
