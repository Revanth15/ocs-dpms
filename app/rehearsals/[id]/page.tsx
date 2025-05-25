"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, Calendar, Clock, FileEdit } from "lucide-react"
import Link from "next/link"
import { Attendance, getRehearsalWithAttendance, type RehearsalWithAttendance } from "@/lib/firebase-service"
import { useParams } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { X } from "lucide-react"

export default function RehearsalDetailsPage() {
  const params = useParams()
  const rehearsalId = params?.id as string
  const [rehearsal, setRehearsal] = useState<RehearsalWithAttendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedContingent, setSelectedContingent] = useState<string | null>(null)

  useEffect(() => {
    if (!rehearsalId) return;

    async function fetchData() {
      try {
        const data = await getRehearsalWithAttendance(rehearsalId)
        setRehearsal(data)
      } catch (err) {
        console.error("Error fetching rehearsal:", err)
        setError("Failed to load rehearsal details")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [rehearsalId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hour12: true }).format(date)
  }

  const isUpcoming = (dateString: string) => new Date(dateString) > new Date()

  if (loading) {
    return (
      <div className="container py-6">
        <div className="py-10 text-center">Loading rehearsal details...</div>
      </div>
    )
  }

  if (error || !rehearsal) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Rehearsal not found"}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/rehearsals">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Rehearsals
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const upcoming = isUpcoming(rehearsal.date)

  // Group attendance by contingent
  const contingentGroups = rehearsal.attendance?.reduce((groups, record) => {
    const contingent = record.contingent?.trim() || "Unknown"
    if (!groups[contingent]) groups[contingent] = []
    groups[contingent].push(record)
    return groups
  }, {} as Record<string, Attendance[]>) || {}

  // Calculate total strength and participating strength
  const totalStrength = rehearsal.attendance?.length || 0
  const participatingStrength = rehearsal.attendance?.filter(m => m.hoursAbsent === 0).length || 0

  // Handler to open modal with selected contingent
  const openModal = (contingent: string) => {
    setSelectedContingent(contingent)
    setModalOpen(true)
  }

  // Participants for modal
  const modalParticipants = selectedContingent ? contingentGroups[selectedContingent] || [] : []

  return (
    <div className="container py-6 space-y-6 p-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Rehearsal Details</h1>
          <h2>{rehearsal.name}</h2>
          <p className="text-muted-foreground mt-2">View rehearsal information and attendance</p>
        </div>
        <div className="flex gap-2">
          <Link href="/rehearsals">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          {upcoming && (
            <Link href={`/rehearsals/${params.id}/attendance`}>
              <Button>
                <FileEdit className="mr-2 h-4 w-4" />
                Take Attendance
              </Button>
            </Link>
          )}
        </div>
      </div>
  
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto p-6">
        <DialogHeader>
          <DialogTitle>{"Participants in Contingent " + selectedContingent}</DialogTitle>
        </DialogHeader>

        {modalParticipants.length === 0 ? (
          <p>No participants found.</p>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 text-left">Participant</th>
                <th className="border border-gray-300 p-2 text-left">Absent</th>
                <th className="border border-gray-300 p-2 text-left">Hours Absent</th>
                <th className="border border-gray-300 p-2 text-left">Periods Absent</th>
                <th className="border border-gray-300 p-2 text-left">Reason</th>
                <th className="border border-gray-300 p-2 text-left">Category</th>
              </tr>
            </thead>
            <tbody>
              {modalParticipants
                .slice()
                .sort((a, b) => {
                  if (a.hoursAbsent > 0 && b.hoursAbsent === 0) return -1
                  if (a.hoursAbsent === 0 && b.hoursAbsent > 0) return 1
                  return 0
                })
                .map((p, i) => (
                  <tr key={i} className={p.hoursAbsent > 0 ? "bg-red-50" : "bg-green-50"}>
                    <td className="border border-gray-300 p-2">{p.participantName || p.participantId}</td>
                    <td className="border border-gray-300 p-2">{p.hoursAbsent > 0 ? "Yes" : "No"}</td>
                    <td className="border border-gray-300 p-2">{p.hoursAbsent}</td>
                    <td className="border border-gray-300 p-2">{p.periodsAbsent}</td>
                    <td className="border border-gray-300 p-2">{p.absenceReason || "N/A"}</td>
                    <td className="border border-gray-300 p-2">{p.absenceCategory || "N/A"}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        )}
      </DialogContent>
    </Dialog>
        

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rehearsal Information</CardTitle>
            {upcoming ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Upcoming
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Completed
              </Badge>
            )}
          </div>
          <CardDescription>
            Created on {rehearsal.createdAt ? new Date(rehearsal.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Date</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(rehearsal.date)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Time</div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formatTime(rehearsal.date)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Duration</div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{rehearsal.duration} hours</span>
              </div>
            </div>
          </div>

          {rehearsal.notes && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Notes</div>
              <div className="rounded-md bg-muted p-3">{rehearsal.notes}</div>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-lg font-medium">Attendance Summary</h2>
            {upcoming && (
              <div className="space-y-4">

                <Card>
                  <CardHeader>
                    <CardTitle>Total Parade Strength</CardTitle>
                    <CardDescription>
                      Total Strength: <strong>{totalStrength}</strong> | Participating Strength: <strong>{participatingStrength}</strong>
                    </CardDescription>
                  </CardHeader>
                </Card> 
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {Object.entries(contingentGroups).map(([contingent, members]) => {
                    const total = members.length
                    const participating = members.filter(m => m.hoursAbsent === 0).length
                    const absentees = members.filter(m => m.hoursAbsent > 0)

                    return (
                      <Card
                        key={contingent}
                        className="cursor-pointer hover:shadow-lg"
                        onClick={() => openModal(contingent)}
                      >
                        <CardHeader>
                          <CardTitle className="text-base">Contingent: {contingent}</CardTitle>
                          <CardDescription>
                            Participating: {participating} / {total}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {absentees.length === 0 ? (
                            <p className="text-sm text-muted-foreground">All members are participating.</p>
                          ) : (
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {absentees.map((a, i) => (
                                <li key={i}>
                                  <span className="font-medium text-foreground">{a.participantName || a.participantId}</span>: {a.absenceReason || "No reason given"}
                                  <p>Missed Periods: {a.periodsAbsent}</p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
