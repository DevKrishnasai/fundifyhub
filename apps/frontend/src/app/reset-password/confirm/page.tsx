"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CheckCircle, Eye, EyeOff, XCircle, KeyRound } from "lucide-react"
import Link from "next/link"
import { PublicHeader } from "@/components/layout/PublicHeader"
import { postWithResult } from "@/lib/api-client"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import { z } from 'zod'

const resetPasswordFormSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

function ResetPasswordConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)

  useEffect(() => {
    // Validate token and email are present
    if (!token || !email) {
      setInvalidLink(true)
    }
  }, [token, email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validate form with Zod
    const validation = resetPasswordFormSchema.safeParse({ password, confirmPassword })
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Invalid input")
      setIsLoading(false)
      return
    }

    try {
      const res = await postWithResult(
        BACKEND_API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD,
        { 
          token, 
          email,
          newPassword: password 
        }
      )

      if (res.ok) {
        setSuccess(true)
      } else {
        if (res.status === 400 && res.error?.message?.toLowerCase().includes('expired')) {
          setError("This reset link has expired. Please request a new one.")
        } else if (res.status === 400 && res.error?.message?.toLowerCase().includes('invalid')) {
          setError("This reset link is invalid. Please request a new one.")
        } else {
          setError(res.error?.message || "Failed to reset password. Please try again.")
        }
      }
    } catch (err) {
      setError("Network error. Please try again.")
    }

    setIsLoading(false)
  }

  // Invalid link state
  if (invalidLink) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="flex items-center justify-center p-4 pt-8 sm:pt-12">
          <div className="w-full max-w-md space-y-6">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle>Invalid Reset Link</CardTitle>
                <CardDescription>
                  This password reset link is invalid or malformed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Please request a new password reset link.
                </p>
                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/reset-password">
                      Request New Reset Link
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href="/login">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to login
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="flex items-center justify-center p-4 pt-8 sm:pt-12">
          <div className="w-full max-w-md space-y-6">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Password Reset Successful</CardTitle>
                <CardDescription>
                  Your password has been updated successfully.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  You can now sign in with your new password.
                </p>
                <Button asChild className="w-full">
                  <Link href="/login">
                    Sign In
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Reset form
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="flex items-center justify-center p-4 pt-8 sm:pt-12">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold">Create New Password</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Enter your new password below
            </p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>
                Choose a strong password for your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      minLength={8}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !password || !confirmPassword}
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to login
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <ResetPasswordConfirmContent />
    </Suspense>
  )
}
