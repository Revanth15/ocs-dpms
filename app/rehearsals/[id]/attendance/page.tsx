"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  getParticipants,
  saveAttendance,
  getRehearsalWithAttendance,
  type Participant,
  type Attendance,
  type RehearsalWithAttendance,
} from "@/lib/firebase-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ParticipantCombobox } from "@/components/participantsCombobox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

interface AttendanceEntry {
  participantId: string
  participantName: string
  participantFormation: string
  participantContingent: string
  periodsAbsent: number
  hoursAbsent: number
  absenceReason?: string
  absenceCategory?: string
}

export default function AttendancePage() {
  const { id: selectedRehearsalId } = useParams()
  const rehearsalId = selectedRehearsalId as string

  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedRehearsal, setSelectedRehearsal] = useState<RehearsalWithAttendance | null>(null)
  const [attendanceList, setAttendanceList] = useState<AttendanceEntry[]>([])
  const [originalAttendanceMap, setOriginalAttendanceMap] = useState<Record<string, Attendance>>({})
  const [absentParticipantId, setAbsentParticipantId] = useState<string | null>(null)
  const [absentPeriods, setAbsentPeriods] = useState<number>(1)
  const [absenceReason, setAbsenceReason] = useState<string>("")
  const [absenceCategory, setAbsenceCategory] = useState<string>("MC")
  const [loading, setLoading] = useState(false)

  const availableParticipants = attendanceList.filter(a => a.periodsAbsent === 0)

  useEffect(() => {
    async function fetchData() {
      const [participantList, rehearsalWithAttendance] = await Promise.all([
        getParticipants(),
        getRehearsalWithAttendance(rehearsalId),
      ])
      setParticipants(participantList)
      setSelectedRehearsal(rehearsalWithAttendance)
      setAbsentPeriods(rehearsalWithAttendance?.duration ?? 1)

      const map: Record<string, Attendance> = {}
      rehearsalWithAttendance?.attendance.forEach((a) => {
        map[a.participantId] = a
      })
      setOriginalAttendanceMap(map)

      const fullAttendanceList: AttendanceEntry[] = participantList.map((p) => {
        const record = map[p.id!] || { participantId: p.id!, periodsAbsent: 0, hoursAbsent: 0 }
        return {
          participantId: p.id!,
          participantName: p.name,
          participantFormation: p.formation,
          participantContingent: p.contingent,
          periodsAbsent: record.periodsAbsent,
          hoursAbsent: record.hoursAbsent,
          absenceReason: record.absenceReason,
          absenceCategory: record.absenceCategory,
        }
      })

      setAttendanceList(fullAttendanceList)
    }

    if (rehearsalId) fetchData()
  }, [rehearsalId])

  function calculateHours(periods: number) {
    return periods * 1
  }

  function addAbsentParticipant() {
    if (!absentParticipantId || !selectedRehearsal) return

    const alreadyAbsent = attendanceList.find(
      (a) => a.participantId === absentParticipantId && a.periodsAbsent > 0
    )
    if (alreadyAbsent) {
      toast.success("Participant already marked absent.")
      return
    }

    const clampedPeriods = Math.min(absentPeriods, selectedRehearsal.duration)

    setAttendanceList((prev) =>
      prev.map((a) =>
        a.participantId === absentParticipantId
          ? {
              ...a,
              periodsAbsent: clampedPeriods,
              hoursAbsent: calculateHours(clampedPeriods),
              absenceReason,
              absenceCategory,
            }
          : a
      )
    )

    setAbsentParticipantId(null)
    setAbsentPeriods(1)
    setAbsenceCategory("MC")
    setAbsenceReason("")
  }

  function markPresent(participantId: string) {
    setAttendanceList((prev) =>
      prev.map((a) =>
        a.participantId === participantId
          ? { ...a, periodsAbsent: 0, hoursAbsent: 0, absenceReason: "", absenceCategory: "" }
          : a
      )
    )
  }

  function updateAbsentPeriods(participantId: string, periods: number) {
    setAttendanceList((prev) =>
      prev.map((a) =>
        a.participantId === participantId
          ? { ...a, periodsAbsent: periods, hoursAbsent: calculateHours(periods) }
          : a
      )
    )
  }

  function updateAbsenceReason(participantId: string, reason: string) {
    setAttendanceList((prev) =>
      prev.map((a) =>
        a.participantId === participantId ? { ...a, absenceReason: reason } : a
      )
    )
  }

  function updateAbsenceCategory(participantId: string, category: string) {
    setAttendanceList((prev) =>
      prev.map((a) =>
        a.participantId === participantId ? { ...a, absenceCategory: category } : a
      )
    )
  }

  async function handleSaveAttendance() {
    if (!rehearsalId) return

    setLoading(true)
    try {
      const modifiedRecords: Attendance[] = attendanceList
        .filter((a) => {
          const original = originalAttendanceMap[a.participantId]
          return (
            !original ||
            original.periodsAbsent !== a.periodsAbsent ||
            original.hoursAbsent !== a.hoursAbsent ||
            original.absenceReason !== a.absenceReason ||
            original.absenceCategory !== a.absenceCategory
          )
        })
        .map((a) => ({
          participantId: a.participantId,
          participantName: a.participantName,
          formation: a.participantFormation,
          contingent: a.participantContingent,
          periodsAbsent: a.periodsAbsent,
          hoursAbsent: a.hoursAbsent,
          absenceReason: a.absenceReason || "",
          absenceCategory: a.absenceCategory || "",
        }))

      if (modifiedRecords.length === 0) {
        toast.info("No changes to save.")
        setLoading(false)
        return
      }

      await saveAttendance(rehearsalId, modifiedRecords)
      toast.success("Attendance saved successfully.")
    } catch (error) {
      console.error("Error saving attendance:", error)
      toast.error("Failed to save attendance.")
    } finally {
      setLoading(false)
    }
  }

  if (!selectedRehearsal) {
    return <div className="p-4">Loading rehearsal data...</div>
  }

  return (
    <div className="p-4 mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Rehearsal Attendance</h1>

      <div className="flex gap-6 items-start">
        <div className="w-3/4 overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4">Attendance List</h2>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Attendance Instructions</AlertTitle>
            <AlertDescription>
              Only select participants who are absent. All others will be marked as present automatically.
            </AlertDescription>
          </Alert>

          <Card className="p-2 mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Absent Periods</TableHead>
                  <TableHead>Absent Hours</TableHead>
                  <TableHead>Absence Category</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reset</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceList.map(
                  ({
                    participantId,
                    participantName,
                    periodsAbsent,
                    hoursAbsent,
                    absenceReason,
                    absenceCategory,
                  }) => (
                    <TableRow
                      key={participantId}
                      className={periodsAbsent > 0 ? "bg-red-50" : ""}
                    >
                      <TableCell>{participantName}</TableCell>
                      <TableCell>
                        {periodsAbsent > 0 ? (
                          <Input
                            type="number"
                            min={1}
                            max={selectedRehearsal?.duration || 99}
                            value={periodsAbsent}
                            onChange={(e) =>
                              updateAbsentPeriods(participantId, Number(e.target.value))
                            }
                            className="w-20"
                          />
                        ) : (
                          0
                        )}
                      </TableCell>
                      <TableCell>{hoursAbsent.toFixed(1)}</TableCell>
                      <TableCell>
                        {periodsAbsent > 0 ? (
                          <Select
                            value={absenceCategory}
                            onValueChange={(value) =>
                              updateAbsenceCategory(participantId, value)
                            }
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MC">MC</SelectItem>
                              <SelectItem value="Report Sick">Report Sick</SelectItem>
                              <SelectItem value="Status">Status</SelectItem>
                              <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          absenceCategory
                        )}
                      </TableCell>
                      <TableCell>
                        {periodsAbsent > 0 ? (
                          <Input
                            type="text"
                            value={absenceReason}
                            onChange={(e) =>
                              updateAbsenceReason(participantId, e.target.value)
                            }
                            className="w-full"
                          />
                        ) : (
                          absenceReason
                        )}
                      </TableCell>
                      <TableCell>
                        {periodsAbsent > 0 && (
                          <Button size="sm" onClick={() => markPresent(participantId)}>
                            Reset
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="w-1/4 sticky top-20">
          <Link href="/rehearsals">
            <Button variant="outline" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="bg-white shadow-md rounded-lg p-4 space-y-4 border">
            <h3 className="text-lg font-semibold">Add Absent Participant</h3>

            {availableParticipants.length > 0 ? (
              <ParticipantCombobox
                participants={availableParticipants.map((a) => ({
                  id: a.participantId,
                  name: a.participantName,
                }))}
                onSelectParticipant={(id: any) => setAbsentParticipantId(id || null)}
              />
            ) : (
              <Button variant="outline" disabled className="w-full justify-between">
                All participants marked absent
              </Button>
            )}

            <Input
              type="number"
              min={1}
              max={selectedRehearsal.duration || 99}
              value={absentPeriods}
              onChange={(e) => setAbsentPeriods(Number(e.target.value))}
              placeholder="Periods absent"
              className="w-full"
            />

            <Select value={absenceCategory} onValueChange={setAbsenceCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MC">MC</SelectItem>
                <SelectItem value="Report Sick">Report Sick</SelectItem>
                <SelectItem value="Status">Status</SelectItem>
                <SelectItem value="Others">Others</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="text"
              value={absenceReason}
              onChange={(e) => setAbsenceReason(e.target.value)}
              placeholder="Absence Reason"
              className="w-full"
            />

            <Button
              onClick={addAbsentParticipant}
              disabled={!absentParticipantId || absentPeriods < 1}
              className="w-full"
            >
              Add Absent
            </Button>

            <hr />

            <Button onClick={handleSaveAttendance} disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Attendance"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
