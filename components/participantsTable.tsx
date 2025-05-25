"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Search, UserCog, History, Trash2 } from "lucide-react";
import {
  deleteParticipant,
  updateParticipant,
  type Participant,
  type Settings,
} from "@/lib/firebase-service";

type ParticipantsTableProps = {
  participants: Participant[];
  settings: Settings | null;
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
};

export function ParticipantsTable({
  participants,
  settings,
  setParticipants,
}: ParticipantsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [formationFilter, setFormationFilter] = useState<string | null>(null);
  const [contingentFilter, setContingentFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formations = Array.from(new Set(participants.map((p) => p.formation)));
  const contingents = Array.from(new Set(participants.map((p) => p.contingent)));

    const dropDownFormations = ["INFANTRY", "ARMOUR", "SIGNAL", "COMBAT ENGINEERS", "ARMY INTELLIGENCE", "LOGISTICS", "AIR FORCE", "NAVY", "MOTORISED INFANTRY"];
    const dropDownContingents = Array.from({ length: 10 }, (_, i) => `${i + 1}`);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormation, setEditFormation] = useState<string>("");
    const [editContingent, setEditContingent] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

    const filteredParticipants = participants
    .filter((participant) => {
      const matchesSearch = participant.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFormation = formationFilter ? participant.formation === formationFilter : true;
      const matchesContingent = contingentFilter ? participant.contingent === contingentFilter : true;
      return matchesSearch && matchesFormation && matchesContingent;
    })
    .sort((a, b) => {
      if (sortDirection === "asc") {
        return a.totalPeriodsAbsent - b.totalPeriodsAbsent;
      }
      if (sortDirection === "desc") {
        return b.totalPeriodsAbsent - a.totalPeriodsAbsent;
      }
      return 0; // no sorting
    });

  const handleDeleteParticipant = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this participant?")) {
      try {
        await deleteParticipant(id);
        setParticipants(participants.filter((p) => p.id !== id));
      } catch (err) {
        console.error("Error deleting participant:", err);
        setError("Failed to delete participant");
      }
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateParticipant(id, {
        formation: editFormation,
        contingent: editContingent,
      });
  
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, formation: editFormation, contingent: editContingent } : p
        )
      );
  
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update participant:", err);
      setError("Failed to update participant");
    }
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) =>
      prev === "asc" ? "desc" : prev === "desc" ? null : "asc"
    );
  };

  return (
    <div className="w-full space-y-4">
      {error && <div className="text-sm font-medium text-destructive mb-4">{error}</div>}

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search participants..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formationFilter || ""}
            onChange={(e) => setFormationFilter(e.target.value || null)}
          >
            <option value="">All Formations</option>
            {formations.map((formation) => (
              <option key={formation} value={formation}>
                {formation}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={contingentFilter || ""}
            onChange={(e) => setContingentFilter(e.target.value || null)}
          >
            <option value="">All Contingents</option>
            {contingents.map((contingent) => (
              <option key={contingent} value={contingent}>
                {contingent}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Formation</TableHead>
              <TableHead>Contingent</TableHead>
              <TableHead onClick={toggleSortDirection} className="cursor-pointer select-none">
                Absence
                {sortDirection === "asc" && " 🔼"}
                {sortDirection === "desc" && " 🔽"}
              </TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParticipants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No participants found.
                </TableCell>
              </TableRow>
            ) : (
              filteredParticipants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium">{participant.name}</TableCell>
                  <TableCell>
                    {editingId === participant.id ? (
                    <select
                        className="w-full rounded border p-1 text-sm"
                        value={editFormation}
                        onChange={(e) => setEditFormation(e.target.value)}
                    >
                        {dropDownFormations.map((f) => (
                        <option key={f} value={f}>
                            {f}
                        </option>
                        ))}
                    </select>
                    ) : (
                    participant.formation
                    )}
                </TableCell>

                <TableCell>
                    {editingId === participant.id ? (
                    <select
                        className="w-full rounded border p-1 text-sm"
                        value={editContingent}
                        onChange={(e) => setEditContingent(e.target.value)}
                    >
                        {dropDownContingents.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                        ))}
                    </select>
                    ) : (
                    participant.contingent
                    )}
                </TableCell>
                  <TableCell>
                    {(() => {
                        const absent = participant.totalPeriodsAbsent

                        let badgeClass = "bg-green-500 text-white"
                        if (absent >= 27) {
                        badgeClass = "bg-black text-white"
                        } else if (absent >= 18) {
                        badgeClass = "bg-red-500 text-white"
                        } else if (absent >= 9) {
                        badgeClass = "bg-yellow-500 text-black"
                        }

                        return (
                        <Badge className={badgeClass}>
                            {absent} / {settings?.maxPeriodsAllowed} periods
                        </Badge>
                        )
                    })()}
                    </TableCell>
                  <TableCell className="flex items-center gap-2">
                    {editingId === participant.id ? (
                        <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveEdit(participant.id!)}
                        >
                            Save
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(null)}
                        >
                            Cancel
                        </Button>
                        </>
                    ) : null}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => {
                            setEditingId(participant.id!);
                            setEditFormation(participant.formation);
                            setEditContingent(participant.contingent);
                            }}
                        >
                            <UserCog className="mr-2 h-4 w-4" />
                            <span>Edit details</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <History className="mr-2 h-4 w-4" />
                            <span>View attendance history</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => participant.id && handleDeleteParticipant(participant.id)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Remove participant</span>
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
