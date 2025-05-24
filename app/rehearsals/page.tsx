"use client";

import { useEffect, useState } from "react";
import { getRehearsals, Rehearsal } from "@/lib/firebase-service";
import { RehearsalsTable } from "@/components/rehearsals";

export default function RehearsalsPage() {
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRehearsals = async () => {
    setLoading(true);
    const data = await getRehearsals();
    setRehearsals(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRehearsals();
  }, []);

  return (
    <main className="p-4">
      {loading ? (
        <div className="text-center py-10">Loading rehearsals...</div>
      ) : (
        <RehearsalsTable rehearsals={rehearsals} onRehearsalCreated={fetchRehearsals} />
      )}
    </main>
  );
}
