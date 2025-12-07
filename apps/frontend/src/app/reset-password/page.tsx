"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Mail } from "lucide-react"
import Link from "next/link"
import { PublicHeader } from "@/components/layout/PublicHeader"
import { postWithResult } from "@/lib/api-client"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import { forgotPasswordSchema } from '@fundifyhub/types'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validate email with Zod
    const result = forgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setError(result.error.errors[0]?.message || "Invalid email")
      setIsLoading(false)
      return
    }

    try {
      const res = await postWithResult(
        BACKEND_API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD,
        { email }
      )

      if (res.ok) {
        setSubmitted(true)
      } else {
        // Always show success message to prevent email enumeration attacks
        // Backend should already handle this, but we ensure it here too
        setSubmitted(true)
      }
    } catch (err) {
      // Even on error, show success to prevent email enumeration
      setSubmitted(true)
    }

    setIsLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="flex items-center justify-center p-4 pt-8 sm:pt-12">
          <div className="w-full max-w-md space-y-6">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Check your email</CardTitle>
                <CardDescription>
                  If an account exists for <span className="font-medium text-foreground">{email}</span>, we&apos;ve sent a password reset link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Didn&apos;t receive the email? Check your spam folder. The link expires in 1 hour.
                </p>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => {
                      setSubmitted(false)
                      setEmail("")
                    }}
                  >
                    Try another email
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

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="flex items-center justify-center p-4 pt-8 sm:pt-12">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold">Reset Password</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Enter your email to receive a reset link
            </p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>Enter Your Email</CardTitle>
              <CardDescription>
                We&apos;ll send you a link to reset your password.
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || !email}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
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
