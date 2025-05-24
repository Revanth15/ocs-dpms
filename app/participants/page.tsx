"use client";

import { useEffect, useState } from "react";
import { ParticipantsTable } from "@/components/participantsTable";
import {
  listenToParticipants, 
  getSettings,
  type Participant,
  type Settings,
} from "@/lib/firebase-service";

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void;

    async function init() {
      try {
        const settingsData = await getSettings();
        setSettings(settingsData);

        // Subscribe to participants snapshot
        unsubscribe = listenToParticipants((liveParticipants) => {
          setParticipants(liveParticipants);
          setLoading(false);
        });
      } catch (err) {
        console.error("Error initializing data:", err);
        setError("Failed to load data");
        setLoading(false);
      }
    }

    init();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <main className="p-4">
      {error && <div className="text-sm text-destructive">{error}</div>}
      {loading ? (
        <div className="text-center py-10">Loading data...</div>
      ) : (
        <ParticipantsTable
          participants={participants}
          setParticipants={setParticipants}
          settings={settings}
        />
      )}
    </main>
  );
}
