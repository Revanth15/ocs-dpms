"use client";

import { UploadParticipantsForm } from "@/components/importParticipants";

export default function UploadPage() {
  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold">Upload Participants</h1>
      <UploadParticipantsForm />
    </main>
  );
}