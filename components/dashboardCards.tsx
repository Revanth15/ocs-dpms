"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, Users, AlertTriangle } from "lucide-react"

interface DashboardStats {
  totalParticipants: number
  totalRehearsals: number
  upcomingRehearsals: any[]
  disqualifiedParticipants: any[]
}

interface DashboardCardsProps {
  stats: DashboardStats
  loading?: boolean
}

export function DashboardCards({ stats, loading = false }: DashboardCardsProps) {
  return (
    <div className="w-full grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : stats.totalParticipants}
          </div>
          <p className="text-xs text-muted-foreground">
            Across all formations and contingents
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Rehearsals</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : stats.totalRehearsals}
          </div>
          <p className="text-xs text-muted-foreground">Completed rehearsal sessions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Rehearsals</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : stats.upcomingRehearsals.length}
          </div>
          <p className="text-xs text-muted-foreground">Scheduled in the next 7 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Disqualified</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : stats.disqualifiedParticipants.length}
          </div>
          <p className="text-xs text-muted-foreground">Exceeded absence limit</p>
        </CardContent>
      </Card>
    </div>
  )
}