"use client"

import Link from "next/link"
import { PublicHeader } from "@/components/layout/PublicHeader"
import { RegistrationSteps } from "./RegistrationSteps"

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PublicHeader />
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Create Your Account</h1>
          <p className="text-muted-foreground">
            Complete the steps below to get started with FundifyHub
          </p>
        </div>

        <RegistrationSteps />

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
