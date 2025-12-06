"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { PublicHeader } from "@/components/layout/PublicHeader"
import { useAuth } from "@/contexts/AuthContext"
import { postWithResult, type ApiResult } from "@/lib/api-client"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import { loginSchema, type LoginPayload, type User } from "@fundifyhub/types"

interface LoginResponse {
  user: User;
  accessToken?: string;
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const result = await postWithResult<LoginResponse>(BACKEND_API_CONFIG.ENDPOINTS.AUTH.LOGIN, payload)
      if (!result.ok) {
        const message = result.error.message || "Login failed"
        const fieldMsg = result.error.fieldErrors ? Object.values(result.error.fieldErrors)[0] : undefined
        throw new Error(fieldMsg || message)
      }
      return result.data
    },
    onSuccess: (data) => {
      login(data.user)
      router.push('/dashboard')
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unable to login'
      setFormError(message)
    }
  })

  const onSubmit = (values: LoginPayload) => {
    setFormError(null)
    loginMutation.mutate(values)
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-muted/20">
      <PublicHeader />
      <div className="flex items-center justify-center p-4 pt-8 sm:pt-12">
        <div className="w-full max-w-md space-y-4 sm:space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold">Welcome Back</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Sign in to your account</p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Sign In</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {(formError || form.formState.errors.email || form.formState.errors.password) && (
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                      {formError || form.formState.errors.email?.message || form.formState.errors.password?.message}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    {...form.register('email')}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      {...form.register('password')}
                      autoComplete="current-password"
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
                  <Link href="/reset-password" className="text-sm text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" className="w-full h-10 sm:h-11" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? (
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
                  Don't have an account?{' '}
                  <Link href="/register" className="text-primary hover:underline font-medium">
                    Sign up
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}