"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
// Removed Checkbox import - no longer needed
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, ArrowLeft, Shield, CreditCard } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { postWithResult } from "@/lib/api-client"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import { loginSchema } from '@fundifyhub/types';
import { z } from 'zod';

export default function LoginPage() {
  const router = useRouter()
  const { success: toastSuccess, error: toastError } = useToast()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  // Removed rememberMe - simplified auth approach
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  // Replace handleSubmit with Zod validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Zod validation
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      setError(result.error.errors[0]?.message || "Invalid input");
      setIsLoading(false);
      return;
    }

    try {
      const res = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.AUTH.LOGIN, result.data)
      if (res.ok) {
        const { user } = res.data
  // show success and login
  toastSuccess(`Login successful! Welcome back, ${user.firstName}! You're being redirected to your dashboard.`)
        login(user)
      } else {
        // map field errors if provided
        if (res.error?.fieldErrors) {
          // prefer showing first field error message
          const firstMsg = Object.values(res.error.fieldErrors)[0]
          setError(firstMsg || res.error.message || 'Login failed')
        } else {
          setError(res.error?.message || 'Login failed. Please check your credentials.')
        }
  toastError(res.error?.message || 'Login failed. Please check your credentials.')
      }
    } catch (err: any) {
  const message = err?.message || 'Network error. Please try again.'
  setError(message)
  toastError(`Login failed: ${message}`)
    }
    setIsLoading(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        {/* top back link removed as requested - keep header focused */}

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">AssetLend</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Welcome back! Sign in to your account</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">Sign In</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Enter your credentials to access your account
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
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
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
              </div>

              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full h-10 sm:h-11" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/auth/register" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}