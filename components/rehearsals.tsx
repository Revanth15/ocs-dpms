"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Rehearsal, createRehearsal } from "@/lib/firebase-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RehearsalsTableProps {
  rehearsals: Rehearsal[];
  onRehearsalCreated?: () => void;
}

type SortKey = "date" | "duration" | null;
type SortDirection = "asc" | "desc";

export function RehearsalsTable({ rehearsals, onRehearsalCreated }: RehearsalsTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState(2);
  const [notes, setNotes] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isFormValid = name.trim().length > 0;

  const handleCreateRehearsal = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      await createRehearsal({
        name,
        date,
        duration,
        notes,
      });
      onRehearsalCreated?.();
      setDialogOpen(false);
      setName("");
      setNotes("");
      setDuration(2);
      setDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      console.error("Failed to create rehearsal:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const filteredRehearsals = useMemo(() => {
    let filtered = rehearsals.filter((r) =>
      (r.name ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortKey) {
      filtered = filtered.slice().sort((a, b) => {
        if (sortKey === "date") {
          const aDate = new Date(a.date).getTime();
          const bDate = new Date(b.date).getTime();
          return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
        }
        if (sortKey === "duration") {
          return sortDirection === "asc" ? a.duration - b.duration : b.duration - a.duration;
        }
        return 0;
      });
    }

    return filtered;
  }, [rehearsals, searchTerm, sortKey, sortDirection]);

  const renderSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSortKey(null);
    setSortDirection("asc");
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Rehearsals</h2>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>New Rehearsal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Rehearsal</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="name-input">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rehearsal name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="date-input">
                    Date
                  </label>
                  <Input
                    id="date-input"
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="duration-input">
                    Duration (hours)
                  </label>
                  <Input
                    id="duration-input"
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="notes-input">
                    Notes
                  </label>
                  <Input
                    id="notes-input"
                    placeholder="Optional notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button onClick={handleCreateRehearsal} disabled={loading || !isFormValid}>
                  {loading ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {(searchTerm !== "" || sortKey !== null) && (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("date")}
              >
                Date{renderSortIndicator("date")}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("duration")}
              >
                Duration{renderSortIndicator("duration")}
              </TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRehearsals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">
                  No rehearsals found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRehearsals.map((rehearsal) => (
                <TableRow key={rehearsal.id}>
                  <TableCell>{rehearsal.name}</TableCell>
                  <TableCell>{format(new Date(rehearsal.date), "PPP p")}</TableCell>
                  <TableCell>{rehearsal.duration} hrs</TableCell>
                  <TableCell>{rehearsal.notes || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/rehearsals/${rehearsal.id}`)}
                    >
                      View
                    </Button>
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
