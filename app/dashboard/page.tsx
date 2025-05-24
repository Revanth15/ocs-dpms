"use client";

import { DashboardCards } from "@/components/dashboardCards";
import { getDashboardData, Participant, Rehearsal } from "@/lib/firebase-service";
import { useEffect, useState } from "react";
import ParticipantsPage from "../participants/page";

export default function dashboard() {
  const [stats, setStats] = useState<{
    totalParticipants: number
    totalRehearsals: number
    upcomingRehearsals: Rehearsal[]
    disqualifiedParticipants: Participant[]
  }>({
    totalParticipants: 0,
    totalRehearsals: 0,
    upcomingRehearsals: [],
    disqualifiedParticipants: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getDashboardData()
        setStats(data)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])


  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
        <DashboardCards stats={stats}
            loading={loading}
        />

        <ParticipantsPage/>
    </div>
  );
}