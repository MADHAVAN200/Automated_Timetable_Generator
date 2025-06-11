
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { TimeSlot } from "@/types";

interface TimePickerProps {
  value: TimeSlot[];
  onChange: (value: TimeSlot[]) => void;
}

export function TimePickerDemo({ value, onChange }: TimePickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>(value || []);

  const addSlot = () => {
    // Using definite values for TimeSlot to satisfy TypeScript
    const newTimeSlot: TimeSlot = {
      start: "09:00",
      end: "10:00"
    };
    const newSlots = [...slots, newTimeSlot];
    setSlots(newSlots);
    onChange(newSlots);
  };

  const removeSlot = (index: number) => {
    const newSlots = slots.filter((_, i) => i !== index);
    setSlots(newSlots);
    onChange(newSlots);
  };

  const updateSlot = (index: number, field: "start" | "end", value: string) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
    onChange(newSlots);
  };

  return (
    <div className="space-y-2">
      {slots.map((slot, index) => (
        <div key={index} className="flex items-center space-x-2">
          <Input
            type="time"
            value={slot.start}
            onChange={(e) => updateSlot(index, "start", e.target.value)}
            className="w-32"
          />
          <span>to</span>
          <Input
            type="time"
            value={slot.end}
            onChange={(e) => updateSlot(index, "end", e.target.value)}
            className="w-32"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeSlot(index)}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={addSlot}
        type="button"
        className="mt-2"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Time Slot
      </Button>
    </div>
  );
}
