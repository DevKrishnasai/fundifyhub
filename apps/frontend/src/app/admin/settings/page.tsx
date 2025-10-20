"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label" 
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Settings,
  Save,
  Bell,
  Shield,
  DollarSign,
  Users,
  Globe,
  Database,
  Mail,
  Smartphone,
} from "lucide-react"
import { toast } from "sonner"

export default function AdminSettingsPage() {
  const [generalSettings, setGeneralSettings] = useState({
    platformName: "AssetLend",
    platformDescription: "Digital asset-backed lending platform",
    supportEmail: "support@assetlend.com",
    supportPhone: "+91 80000 12345",
    businessHours: "9:00 AM - 6:00 PM",
    timezone: "Asia/Kolkata",
  })

  const [loanSettings, setLoanSettings] = useState({
    minLoanAmount: 5000,
    maxLoanAmount: 500000,
    defaultInterestRate: 12,
    minInterestRate: 8,
    maxInterestRate: 24,
    maxTenureMonths: 12,
    processingFeePercent: 2,
    platformFeePercent: 1,
    autoApprovalLimit: 25000,
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    reminderDays: 3,
    overdueNotifications: true,
    paymentConfirmations: true,
    systemAlerts: true,
  })

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorRequired: false,
    sessionTimeout: 30,
    passwordComplexity: true,
    loginAttempts: 3,
    accountLockoutMinutes: 15,
    dataEncryption: true,
  })

  const handleSaveGeneral = () => {
    // Save general settings logic
    toast.success("General settings saved successfully!")
  }

  const handleSaveLoans = () => {
    // Save loan settings logic  
    toast.success("Loan settings saved successfully!")
  }

  const handleSaveNotifications = () => {
    // Save notification settings logic
    toast.success("Notification settings saved successfully!")
  }

  const handleSaveSecurity = () => {
    // Save security settings logic
    toast.success("Security settings saved successfully!")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600">Configure platform settings and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="text-xs sm:text-sm">General</TabsTrigger>
            <TabsTrigger value="loans" className="text-xs sm:text-sm">Loans</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">Notifications</TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm">Security</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  General Platform Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="platformName">Platform Name</Label>
                    <Input
                      id="platformName"
                      value={generalSettings.platformName}
                      onChange={(e) => setGeneralSettings({...generalSettings, platformName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={generalSettings.timezone} 
                      onValueChange={(value) => setGeneralSettings({...generalSettings, timezone: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="platformDescription">Platform Description</Label>
                  <Textarea
                    id="platformDescription"
                    value={generalSettings.platformDescription}
                    onChange={(e) => setGeneralSettings({...generalSettings, platformDescription: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={generalSettings.supportEmail}
                      onChange={(e) => setGeneralSettings({...generalSettings, supportEmail: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supportPhone">Support Phone</Label>
                    <Input
                      id="supportPhone"
                      value={generalSettings.supportPhone}
                      onChange={(e) => setGeneralSettings({...generalSettings, supportPhone: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="businessHours">Business Hours</Label>
                  <Input
                    id="businessHours"
                    value={generalSettings.businessHours}
                    onChange={(e) => setGeneralSettings({...generalSettings, businessHours: e.target.value})}
                  />
                </div>

                <Button onClick={handleSaveGeneral} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save General Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loan Settings */}
          <TabsContent value="loans">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Loan Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minLoanAmount">Minimum Loan Amount (₹)</Label>
                    <Input
                      id="minLoanAmount"
                      type="number"
                      value={loanSettings.minLoanAmount}
                      onChange={(e) => setLoanSettings({...loanSettings, minLoanAmount: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxLoanAmount">Maximum Loan Amount (₹)</Label>
                    <Input
                      id="maxLoanAmount"
                      type="number"
                      value={loanSettings.maxLoanAmount}
                      onChange={(e) => setLoanSettings({...loanSettings, maxLoanAmount: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="defaultInterestRate">Default Interest Rate (%)</Label>
                    <Input
                      id="defaultInterestRate"
                      type="number"
                      step="0.1"
                      value={loanSettings.defaultInterestRate}
                      onChange={(e) => setLoanSettings({...loanSettings, defaultInterestRate: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="minInterestRate">Min Interest Rate (%)</Label>
                    <Input
                      id="minInterestRate"
                      type="number"
                      step="0.1"
                      value={loanSettings.minInterestRate}
                      onChange={(e) => setLoanSettings({...loanSettings, minInterestRate: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxInterestRate">Max Interest Rate (%)</Label>
                    <Input
                      id="maxInterestRate"
                      type="number"
                      step="0.1"
                      value={loanSettings.maxInterestRate}
                      onChange={(e) => setLoanSettings({...loanSettings, maxInterestRate: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="maxTenureMonths">Max Tenure (Months)</Label>
                    <Input
                      id="maxTenureMonths"
                      type="number"
                      value={loanSettings.maxTenureMonths}
                      onChange={(e) => setLoanSettings({...loanSettings, maxTenureMonths: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="processingFeePercent">Processing Fee (%)</Label>
                    <Input
                      id="processingFeePercent"
                      type="number"
                      step="0.1"
                      value={loanSettings.processingFeePercent}
                      onChange={(e) => setLoanSettings({...loanSettings, processingFeePercent: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="platformFeePercent">Platform Fee (%)</Label>
                    <Input
                      id="platformFeePercent"
                      type="number"
                      step="0.1"
                      value={loanSettings.platformFeePercent}
                      onChange={(e) => setLoanSettings({...loanSettings, platformFeePercent: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="autoApprovalLimit">Auto-Approval Limit (₹)</Label>
                  <Input
                    id="autoApprovalLimit"
                    type="number"
                    value={loanSettings.autoApprovalLimit}
                    onChange={(e) => setLoanSettings({...loanSettings, autoApprovalLimit: parseInt(e.target.value)})}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Loans below this amount will be auto-approved if criteria are met
                  </p>
                </div>

                <Button onClick={handleSaveLoans} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save Loan Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">Send notifications via email</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-sm text-muted-foreground">Send notifications via SMS</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, smsNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Push Notifications</p>
                        <p className="text-sm text-muted-foreground">Send push notifications to mobile app</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, pushNotifications: checked})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reminderDays">Payment Reminder (Days Before Due)</Label>
                  <Input
                    id="reminderDays"
                    type="number"
                    value={notificationSettings.reminderDays}
                    onChange={(e) => setNotificationSettings({...notificationSettings, reminderDays: parseInt(e.target.value)})}
                    className="w-24"
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Notification Types</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overdue Notifications</span>
                      <Switch 
                        checked={notificationSettings.overdueNotifications}
                        onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, overdueNotifications: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Payment Confirmations</span>
                      <Switch 
                        checked={notificationSettings.paymentConfirmations}
                        onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, paymentConfirmations: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">System Alerts</span>
                      <Switch 
                        checked={notificationSettings.systemAlerts}
                        onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, systemAlerts: checked})}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveNotifications} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security & Access Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                    </div>
                    <Switch 
                      checked={securitySettings.twoFactorRequired}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, twoFactorRequired: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Password Complexity</p>
                      <p className="text-sm text-muted-foreground">Enforce strong password requirements</p>
                    </div>
                    <Switch 
                      checked={securitySettings.passwordComplexity}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, passwordComplexity: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Data Encryption</p>
                      <p className="text-sm text-muted-foreground">Encrypt sensitive data at rest</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                      <Switch 
                        checked={securitySettings.dataEncryption}
                        onCheckedChange={(checked) => setSecuritySettings({...securitySettings, dataEncryption: checked})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (Minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="loginAttempts">Max Login Attempts</Label>
                    <Input
                      id="loginAttempts"
                      type="number"
                      value={securitySettings.loginAttempts}
                      onChange={(e) => setSecuritySettings({...securitySettings, loginAttempts: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountLockoutMinutes">Account Lockout (Minutes)</Label>
                    <Input
                      id="accountLockoutMinutes"
                      type="number"
                      value={securitySettings.accountLockoutMinutes}
                      onChange={(e) => setSecuritySettings({...securitySettings, accountLockoutMinutes: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveSecurity} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}