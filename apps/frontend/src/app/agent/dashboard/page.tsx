"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Users, 
  ClipboardList, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Search,
  Eye
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function AgentDashboard() {
  const [searchQuery, setSearchQuery] = useState("")

  const assignedRequests = [
    {
      id: "LR001",
      customer: "John Doe",
      asset: "iPhone 14 Pro",
      amount: 45000,
      status: "pending_inspection",
      assignedDate: "2025-01-15"
    },
    {
      id: "LR002", 
      customer: "Jane Smith",
      asset: "MacBook Air M2",
      amount: 65000,
      status: "inspection_completed",
      assignedDate: "2025-01-14"
    },
    {
      id: "LR003",
      customer: "Mike Johnson", 
      asset: "Honda City 2020",
      amount: 150000,
      status: "pending_inspection",
      assignedDate: "2025-01-13"
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_inspection":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending Inspection</Badge>
      case "inspection_completed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
      case "urgent":
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Urgent</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Welcome Section */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Agent Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage inspections and process loan requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Assigned Requests</p>
                <p className="text-xl sm:text-2xl font-bold">12</p>
              </div>
              <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Pending Inspections</p>
                <p className="text-xl sm:text-2xl font-bold">8</p>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Completed Today</p>
                <p className="text-xl sm:text-2xl font-bold">4</p>
              </div>
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Active Customers</p>
                <p className="text-xl sm:text-2xl font-bold">28</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Assigned Loan Requests</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignedRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{request.customer}</h3>
                    <p className="text-sm text-muted-foreground">{request.asset} - ₹{request.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">ID: {request.id} | Assigned: {request.assignedDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(request.status)}
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/request/${request.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}