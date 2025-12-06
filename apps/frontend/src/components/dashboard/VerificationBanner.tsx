"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Clock, FileText } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export function VerificationBanner() {
  const { user } = useAuth()

  // Don't show banner if user is verified or verification fields not present
  if (!user || user.isVerified) {
    return null
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/10">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="mt-0.5">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTitle className="text-base font-semibold">
                  Verification Pending
                </AlertTitle>
                <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-500">
                  Under Review
                </Badge>
              </div>
              <AlertDescription className="text-sm text-muted-foreground">
                Your account is currently under verification. You can view your dashboard, but some actions are restricted until your identity documents are verified by our admin team.
              </AlertDescription>
            </div>

            {/* ID Proof Status */}
            {user.idProofType && (
              <div className="flex items-start gap-3 rounded-md bg-background/50 p-3 border">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Submitted Documents</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">{user.idProofType}</span>
                    {user.idProofNumber && (
                      <>
                        <span>•</span>
                        <span className="font-mono">{user.idProofNumber}</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              </div>
            )}

            {/* What's Next */}
            <div className="text-sm space-y-2">
              <p className="font-medium">What happens next?</p>
              <ul className="space-y-1.5 text-muted-foreground ml-1">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 dark:text-yellow-500 mt-0.5">•</span>
                  <span>Our admin team will review your submitted documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 dark:text-yellow-500 mt-0.5">•</span>
                  <span>You'll receive a notification once verification is complete</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 dark:text-yellow-500 mt-0.5">•</span>
                  <span>After verification, you can create loan requests and access all features</span>
                </li>
              </ul>
            </div>

            {/* Estimated Time */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Verification typically takes 1-2 business days</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
