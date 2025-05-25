import { db } from "./firebase"
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  type Timestamp,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore"

// Types
export interface Participant {
  id?: string
  name: string
  formation: string
  contingent: string
  totalPeriodsAbsent: number
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface Rehearsal {
  id?: string
  name: string
  date: string
  duration: number
  notes?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface Attendance {
  participantId: string
  participantName: string
  contingent: string
  formation: string
  hoursAbsent: number
  periodsAbsent: number
  absenceReason: string
  absenceCategory: string
}

export interface RehearsalWithAttendance extends Rehearsal {
  attendance: Attendance[]
  totalParticipants?: number
  absentParticipants?: number
}

export interface Settings {
  maxPeriodsAllowed: number
  defaultAbsentHours: number
  sendEmailNotifications: boolean
  autoDisqualify: boolean
}

// Participants
export async function getParticipants(): Promise<Participant[]> {
  const participantsRef = collection(db, "participants")
  const snapshot = await getDocs(participantsRef)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Participant[]
}

export async function getParticipant(id: string): Promise<Participant | null> {
  const docRef = doc(db, "participants", id)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Participant
  } else {
    return null
  }
}

export async function createParticipant(
  participant: Omit<Participant, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const participantsRef = collection(db, "participants")
  const newParticipant = {
    ...participant,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(participantsRef, newParticipant)
  return docRef.id
}

export async function updateParticipant(
  id: string,
  participant: Partial<Omit<Participant, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  const docRef = doc(db, "participants", id)
  await updateDoc(docRef, {
    ...participant,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteParticipant(id: string): Promise<void> {
  const docRef = doc(db, "participants", id)
  await deleteDoc(docRef)
}

export async function bulkCreateParticipants(
  participants: Omit<Participant, "id" | "createdAt" | "updatedAt">[],
): Promise<string[]> {
  const ids: string[] = []

  for (const participant of participants) {
    const id = await createParticipant(participant)
    ids.push(id)
  }

  return ids
}

export function listenToParticipants(callback: (participants: Participant[]) => void): () => void {
  const participantsRef = collection(db, "participants")

  const unsubscribe = onSnapshot(participantsRef, (snapshot) => {
    const participants = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Participant[]
    callback(participants)
  })

  return unsubscribe // Call this to stop listening
}

// Rehearsals
export async function getRehearsals(): Promise<Rehearsal[]> {
  const rehearsalsRef = collection(db, "rehearsals")
  const q = query(rehearsalsRef, orderBy("date", "desc"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Rehearsal[]
}

export async function getRehearsal(id: string): Promise<Rehearsal | null> {
  const docRef = doc(db, "rehearsals", id)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Rehearsal
  } else {
    return null
  }
}

// Update the createRehearsal function to ensure it properly handles the date
export async function createRehearsal(rehearsal: Omit<Rehearsal, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const rehearsalsRef = collection(db, "rehearsals")

  // Make sure the date is properly formatted as an ISO string
  const newRehearsal = {
    ...rehearsal,
    date: rehearsal.date, // Ensure this is already an ISO string
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  try {
    const docRef = await addDoc(rehearsalsRef, newRehearsal)
    return docRef.id
  } catch (error) {
    console.error("Error creating rehearsal:", error)
    throw error
  }
}

export async function updateRehearsal(
  id: string,
  rehearsal: Partial<Omit<Rehearsal, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  const docRef = doc(db, "rehearsals", id)
  await updateDoc(docRef, {
    ...rehearsal,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteRehearsal(id: string): Promise<void> {
  const docRef = doc(db, "rehearsals", id)
  await deleteDoc(docRef)
}

// Attendance
export async function getRehearsalWithAttendance(id: string): Promise<RehearsalWithAttendance | null> {
  const rehearsal = await getRehearsal(id)
  if (!rehearsal) return null

  const attendanceRef = collection(db, "rehearsals", id, "attendance")
  const snapshot = await getDocs(attendanceRef)
  const attendance = snapshot.docs.map((doc) => doc.data()) as Attendance[]

  return {
    ...rehearsal,
    attendance,
    absentParticipants: attendance.length,
  }
}

export async function saveAttendance(rehearsalId: string, attendance: Attendance[]): Promise<void> {
  const attendanceRef = collection(db, "rehearsals", rehearsalId, "attendance");
  const snapshot = await getDocs(attendanceRef);

  // Create a map of existing attendance by participantId
  const existingAttendanceMap: Record<string, Attendance> = {};
  snapshot.docs.forEach((doc) => {
    existingAttendanceMap[doc.id] = doc.data() as Attendance;
  });

  // Overwrite all attendance documents
  const setAttendancePromises = attendance.map(async (record) => {
    await setDoc(doc(attendanceRef, record.participantId), record);

    // Adjust participant's totalPeriodsAbsent based on the delta
    const participantRef = doc(db, "participants", record.participantId);
    const participantSnap = await getDoc(participantRef);

    if (participantSnap.exists()) {
      const participant = participantSnap.data() as Participant;
      const previous = existingAttendanceMap[record.participantId];
      const previousPeriods = previous?.periodsAbsent || 0;

      const newTotal = (participant.totalPeriodsAbsent || 0) - previousPeriods + record.periodsAbsent;

      await updateDoc(participantRef, {
        totalPeriodsAbsent: newTotal,
        updatedAt: serverTimestamp(),
      });
    }
  });

  await Promise.all(setAttendancePromises);
}

export function listenToRehearsals(callback: (rehearsals: Rehearsal[]) => void): () => void {
  const rehearsalsRef = collection(db, "rehearsals")
  const q = query(rehearsalsRef, orderBy("date", "desc"))

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const rehearsals = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Rehearsal[]
    callback(rehearsals)
  })

  return unsubscribe
}

// Settings
export async function getSettings(): Promise<Settings> {
  const docRef = doc(db, "settings", "general")
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return docSnap.data() as Settings
  } else {
    // Return default settings if not found
    return {
      maxPeriodsAllowed: 3,
      defaultAbsentHours: 9,
      sendEmailNotifications: true,
      autoDisqualify: true,
    }
  }
}

export async function updateSettings(settings: Settings): Promise<void> {
  const docRef = doc(db, "settings", "general")
  await setDoc(docRef, settings)
}

// Dashboard data
export async function getDashboardData() {
  const participants = await getParticipants()
  const rehearsals = await getRehearsals()

  const now = new Date()
  const upcomingRehearsals = rehearsals
    .filter((rehearsal) => new Date(rehearsal.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const settings = await getSettings()
  const disqualifiedParticipants = participants.filter(
    (participant) => participant.totalPeriodsAbsent > settings.maxPeriodsAllowed,
  )

  return {
    totalParticipants: participants.length,
    totalRehearsals: rehearsals.length,
    upcomingRehearsals: upcomingRehearsals.slice(0, 3),
    disqualifiedParticipants,
  }
}
