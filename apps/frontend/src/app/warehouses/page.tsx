"use client"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { Card, CardContent } from "@/components/ui/card"

function WarehousesContent() {
  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title="Warehouses"
          description="Manage warehouse locations and inventory"
        />
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Warehouses management coming soon. Under construction.</p>
          </CardContent>
        </Card>
      </PageContainer>
    </AppLayout>
  )
}

export default function WarehousesPage() {
  return (
    <ProtectedRoute>
      <WarehousesContent />
    </ProtectedRoute>
  )
}
