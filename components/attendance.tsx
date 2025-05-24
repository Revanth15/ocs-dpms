"use client";

import React, { useEffect, useState } from "react";
import {
  getParticipants,
  getRehearsals,
  saveAttendance,
  getRehearsalWithAttendance,
  type Participant,
  type Rehearsal,
  type Attendance,
  RehearsalWithAttendance,
} from "@/lib/firebase-service";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ParticipantCombobox } from "./participantsCombobox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";

  import { Card } from "./ui/card";

  import { toast } from "sonner";

interface AttendanceEntry {
  participantId: string;
  participantName: string;
  periodsAbsent: number;
  hoursAbsent: number;
  absenceReason?: string;
  absenceCategory?: string;
}

export default function AttendancePage() {
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedRehearsalId, setSelectedRehearsalId] = useState<string | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceEntry[]>([]);
  const [absentParticipantId, setAbsentParticipantId] = useState<string | null>(null);
  const [absentPeriods, setAbsentPeriods] = useState<number>(1);
  const [absenceReason, setAbsenceReason] = useState<string>("");
  const [absenceCategory, setAbsenceCategory] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const availableParticipants = attendanceList.filter(a => a.periodsAbsent === 0);
  const [originalAttendanceMap, setOriginalAttendanceMap] = useState<Record<string, Attendance>>({});
  const selectedRehearsal = rehearsals.find(r => r.id === selectedRehearsalId);

  useEffect(() => {
    async function fetchData() {
      const [r, p] = await Promise.all([getRehearsals(), getParticipants()]);
      setRehearsals(r);
      setParticipants(p);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedRehearsal) {
      setAbsentPeriods(selectedRehearsal.duration);
    }
  }, [selectedRehearsal]);

  useEffect(() => {
    async function loadAttendance() {
      if (!selectedRehearsalId) {
        setAttendanceList([]);
        setOriginalAttendanceMap({});
        return;
      }
  
      const rehearsalWithAttendance = await getRehearsalWithAttendance(selectedRehearsalId);
  
      if (!rehearsalWithAttendance) {
        setAttendanceList([]);
        setOriginalAttendanceMap({});
        return;
      }
  
      const map: Record<string, Attendance> = {};
      rehearsalWithAttendance.attendance.forEach((a) => {
        map[a.participantId] = a;
      });
    //   setOriginalAttendanceMap(map);
      setOGMap(rehearsalWithAttendance)
  
      const fullAttendanceList: AttendanceEntry[] = participants.map((p) => {
        const record = map[p.id!] || { participantId: p.id!, periodsAbsent: 0, hoursAbsent: 0 };
        return {
          participantId: p.id!,
          participantName: p.name,
          periodsAbsent: record.periodsAbsent,
          hoursAbsent: record.hoursAbsent,
          absenceReason: record.absenceReason,
          absenceCategory: record.absenceCategory
        };
      });
  
      setAttendanceList(fullAttendanceList);
    }
  
    loadAttendance();
  }, [selectedRehearsalId, participants]);

  async function setOGMap(record?: RehearsalWithAttendance | null) {
    if (!selectedRehearsalId) return;
  
    let val: RehearsalWithAttendance | null = record ?? await getRehearsalWithAttendance(selectedRehearsalId);
  
    if (!val) {
      setOriginalAttendanceMap({});
      return;
    }
  
    const map: Record<string, Attendance> = {};
    val.attendance.forEach((a) => {
      map[a.participantId] = a;
    });
  
    setOriginalAttendanceMap(map);
  }

  function addAbsentParticipant() {
    if (!absentParticipantId || !selectedRehearsal) return;

    const alreadyAbsent = attendanceList.find(
      (a) => a.participantId === absentParticipantId && a.periodsAbsent > 0
    );
    if (alreadyAbsent) {
        toast.success("Participant already marked absent.")
      return;
    }

    const clampedPeriods = Math.min(absentPeriods, selectedRehearsal.duration);

    setAttendanceList((prev) =>
      prev.map((a) =>
        a.participantId === absentParticipantId
          ? {
              ...a,
              periodsAbsent: clampedPeriods,
              hoursAbsent: calculateHours(clampedPeriods),
              absenceReason: absenceReason,
              absenceCategory: absenceCategory,
            }
          : a
      )
    );

    setAbsentParticipantId(null);
    setAbsentPeriods(1);
    setAbsenceCategory("MC");
  }

  function calculateHours(periods: number) {
    return periods * 1;
  }

  function updateAbsentPeriods(participantId: string, periods: number) {
    setAttendanceList((prev) =>
      prev.map((a) =>
        a.participantId === participantId
          ? { ...a, periodsAbsent: periods, hoursAbsent: calculateHours(periods) }
          : a
      )
    );
  }

  function updateAbsenceReason(participantId: string, reason: string) {
    setAttendanceList((prev) =>
      prev.map((a) =>
        a.participantId === participantId
          ? { ...a, absenceReason: reason}
          : a
      )
    );
  }

  function updateAbsenceCategory(participantId: string, category: string) {
    setAttendanceList((prev) =>
      prev.map((a) =>
        a.participantId === participantId
          ? { ...a, absenceCategory: category}
          : a
      )
    );
  }

  function markPresent(participantId: string) {
    setAttendanceList((prev) =>
      prev.map((a) =>
        a.participantId === participantId
          ? { ...a, periodsAbsent: 0, hoursAbsent: 0, absenceReason: "", absenceCategory: "" }
          : a
      )
    );
  }

  async function handleSaveAttendance() {
    if (!selectedRehearsalId) return;
  
    setLoading(true);
    try {
      const modifiedRecords: Attendance[] = attendanceList.filter((a) => {
        const original = originalAttendanceMap[a.participantId];
        return (
          !original ||
          original.periodsAbsent !== a.periodsAbsent ||
          original.hoursAbsent !== a.hoursAbsent ||
          original.absenceReason !== a.absenceReason ||
          original.absenceCategory !== a.absenceCategory
        );
      }).map((a) => ({
        participantId: a.participantId,
        periodsAbsent: a.periodsAbsent,
        hoursAbsent: a.hoursAbsent,
        absenceReason: a.absenceReason || "",
        absenceCategory: a.absenceCategory || ""
      }));
  
      if (modifiedRecords.length === 0) {
        toast.info("No changes to save.")
        setLoading(false);
        return;
      }
  
      await saveAttendance(selectedRehearsalId, modifiedRecords);
      setOGMap()
      toast.success("Attendance saved successfully.")
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.success("Failed to save attendance.")
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 mx-auto space-y-6">
  <h1 className="text-2xl font-bold">Rehearsal Attendance</h1>

  {/* Rehearsal Selector */}
  <div>
    <label htmlFor="rehearsal-select" className="block font-medium mb-1">
      Select Rehearsal:
    </label>
    <Select
      value={selectedRehearsalId || ""}
      onValueChange={(value) => setSelectedRehearsalId(value || null)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a rehearsal" />
      </SelectTrigger>
      <SelectContent>
        {rehearsals.map((r) => (
          <SelectItem key={r.id} value={r.id!}>
            {r.name} - {new Date(r.date).toLocaleDateString()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {selectedRehearsalId && (
    <div className="flex gap-6 items-start">
      <div className="w-3/4 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">Attendance List</h2>

        <Card className="p-2">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Absent Periods</TableHead>
                <TableHead>Absent Hours</TableHead>
                <TableHead>Absence Category</TableHead>
                <TableHead>Reason for Absence</TableHead>
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
                    absenceCategory
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
                            onValueChange={(value) => updateAbsenceCategory(participantId, value)}
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

      <div className="w-1/4 sticky top-6">
        <div className="bg-white shadow-md rounded-lg p-4 space-y-4 border">
          <h3 className="text-lg font-semibold">Add Absent Participant</h3>

          {availableParticipants.length > 0 ? (
            <ParticipantCombobox
              participants={availableParticipants.map((a) => ({
                id: a.participantId,
                name: a.participantName,
              }))}
              onSelectParticipant={(id) => setAbsentParticipantId(id || null)}
            />
          ) : (
            <Button variant="outline" disabled className="w-full justify-between">
              All participants marked absent
            </Button>
          )}

          <Input
            type="number"
            min={1}
            max={selectedRehearsal?.duration || 99}
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

          <Button
            onClick={handleSaveAttendance}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      </div>
    </div>
  )}
</div>

  );
}