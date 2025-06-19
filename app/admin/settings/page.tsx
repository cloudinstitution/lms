"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Settings, User, Bell, Shield, CreditCard, Save, Upload } from "lucide-react"
import { getAdminSession } from "@/lib/session-storage"
import TeacherManagement from "./components/TeacherManagement"

export default function AdminSettings() {
  const [isLoading, setIsLoading] = useState(false)
  const [adminData, setAdminData] = useState<any>(null)

  useEffect(() => {
    const data = getAdminSession()
    if (data) {
      setAdminData(data)
    }
  }, [])

  const handleSave = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="general">        <TabsList className={`grid ${adminData?.role === 'admin' ? 'grid-cols-6' : 'grid-cols-5'} w-full max-w-3xl`}>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          {adminData?.role === 'admin' && (
            <TabsTrigger value="teachers" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Teachers</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage your academy's general settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="academy-name">Academy Name</Label>
                <Input id="academy-name" defaultValue="Learning Academy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academy-email">Contact Email</Label>
                <Input id="academy-email" type="email" defaultValue="info@learningacademy.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academy-phone">Contact Phone</Label>
                <Input id="academy-phone" defaultValue="+91 1234567890" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academy-address">Address</Label>
                <Textarea id="academy-address" defaultValue="123 Education Street, Bangalore, Karnataka 560001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academy-logo">Academy Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <Button variant="outline" size="sm">
                    Change Logo
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={isLoading} className="gap-1">
                <Save className="h-4 w-4" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="admin-name">Full Name</Label>
                <Input id="admin-name" defaultValue="Admin User" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input id="admin-email" type="email" defaultValue="admin@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-phone">Phone</Label>
                <Input id="admin-phone" defaultValue="+91 9876543210" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-bio">Bio</Label>
                <Textarea
                  id="admin-bio"
                  defaultValue="Administrator with experience in educational technology and course management."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-avatar">Profile Picture</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xl">
                    A
                  </div>
                  <Button variant="outline" size="sm">
                    Change Picture
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={isLoading} className="gap-1">
                <Save className="h-4 w-4" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Notifications</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="new-enrollment">New Enrollments</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications when a new student enrolls</p>
                  </div>
                  <Switch id="new-enrollment" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="course-completion">Course Completions</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when a student completes a course
                    </p>
                  </div>
                  <Switch id="course-completion" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="payment-notification">Payment Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications for new payments</p>
                  </div>
                  <Switch id="payment-notification" defaultChecked />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Notifications</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="system-updates">System Updates</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications about system updates</p>
                  </div>
                  <Switch id="system-updates" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="security-alerts">Security Alerts</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications about security issues</p>
                  </div>
                  <Switch id="security-alerts" defaultChecked />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={isLoading} className="gap-1">
                <Save className="h-4 w-4" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>        
        <TabsContent value="teachers">
          <TeacherManagement />
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Change Password</h3>
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="two-factor">Enable Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch id="two-factor" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Session Management</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="session-timeout">Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">Automatically log out after a period of inactivity</p>
                  </div>
                  <Switch id="session-timeout" defaultChecked />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={isLoading} className="gap-1">
                <Save className="h-4 w-4" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
              <CardDescription>Manage your payment methods and billing information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Payment Methods</h3>
                <div className="border rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">HDFC Bank Credit Card</p>
                        <p className="text-sm text-muted-foreground">Ending in 4242</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Add Payment Method
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Billing Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="billing-name">Name</Label>
                  <Input id="billing-name" defaultValue="Learning Academy Pvt Ltd" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-email">Email</Label>
                  <Input id="billing-email" type="email" defaultValue="billing@learningacademy.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-address">Billing Address</Label>
                  <Textarea id="billing-address" defaultValue="123 Education Street, Bangalore, Karnataka 560001" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billing-city">City</Label>
                    <Input id="billing-city" defaultValue="Bangalore" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing-pincode">PIN Code</Label>
                    <Input id="billing-pincode" defaultValue="560001" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-gstin">GSTIN</Label>
                  <Input id="billing-gstin" defaultValue="29AABCU9603R1ZJ" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={isLoading} className="gap-1">
                <Save className="h-4 w-4" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
