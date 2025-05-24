"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Participant } from "@/lib/firebase-service";

interface Props {
  participants: { id: string; name: string }[];
  onSelectParticipant: (id: string) => void;
}

export function ParticipantCombobox({ participants, onSelectParticipant }: Props) {
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selectedName = participants.find((p) => p.id === selectedId)?.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedName || "Select participant..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[250px] p-0">
        <Command filter={(value, search) =>
          participants.find((p) => p.id === value)?.name
            .toLowerCase()
            .includes(search.toLowerCase())
            ? 1
            : 0
        }
        >
          <CommandInput placeholder="Search participants..." />
          <CommandList>
            <CommandEmpty>No participants found.</CommandEmpty>
            <CommandGroup>
              {participants.map((participant) => (
                <CommandItem
                  key={participant.id}
                  value={participant.id}
                  onSelect={(currentValue) => {
                    setSelectedId(currentValue === selectedId ? null : currentValue);
                    setOpen(false);
                    onSelectParticipant(currentValue);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedId === participant.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {participant.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
