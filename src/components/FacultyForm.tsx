
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Faculty, Subject, TimeSlot } from "@/types";
import { DAYS_OF_WEEK, POSITIONS } from "@/utils/constants";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TimePickerDemo } from "./TimePicker";
import { v4 as uuidv4 } from "uuid";

// Define TimeSlot schema
const timeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

// Ensure position is strictly typed to only allow 'HOD' or 'Regular'
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Faculty name must be at least 2 characters.",
  }),
  position: z.enum(["HOD", "Regular"]),
  subjects: z.array(z.string()).min(1, {
    message: "Please select at least one subject.",
  }),
  availability: z.record(
    z.string(),
    z.array(timeSlotSchema)
  ),
});

interface FacultyFormProps {
  subjects: Subject[];
  onSave: (faculty: Faculty) => void;
  editFaculty?: Faculty;
}

export const FacultyForm = ({ subjects, onSave, editFaculty }: FacultyFormProps) => {
  const [availabilityDays, setAvailabilityDays] = useState<string[]>([]);

  // Initialize with proper default values that match the TimeSlot type
  const defaultAvailability: Record<string, TimeSlot[]> = {};
  
  // Explicitly cast position to the literal type
  const defaultPosition: 'HOD' | 'Regular' = editFaculty?.position === "HOD" ? "HOD" : "Regular";
  
  console.log("Form initialized with position:", defaultPosition, "Type:", typeof defaultPosition);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editFaculty?.name || "",
      position: defaultPosition,
      subjects: editFaculty?.subjects || [],
      availability: editFaculty?.availability || defaultAvailability,
    },
  });

  // Handle day selection for availability
  const toggleDay = (day: string) => {
    if (availabilityDays.includes(day)) {
      setAvailabilityDays(availabilityDays.filter((d) => d !== day));
    } else {
      setAvailabilityDays([...availabilityDays, day]);
    }
  };

  // Set time slots for a day - ensure we're working with TimeSlot objects
  const setTimeSlots = (day: string, slots: any[]) => {
    // Ensure each slot is a proper TimeSlot with required properties
    const validSlots: TimeSlot[] = slots.map(slot => ({
      start: typeof slot.start === 'string' ? slot.start : "09:00",
      end: typeof slot.end === 'string' ? slot.end : "10:00"
    }));
    
    form.setValue(`availability.${day}`, validSlots);
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Ensure availability is correctly typed
    const typedAvailability: Record<string, TimeSlot[]> = {};
    
    // Convert each day's slots to ensure they are proper TimeSlot objects
    Object.entries(values.availability).forEach(([day, slots]) => {
      typedAvailability[day] = slots.map(slot => ({
        start: slot.start,
        end: slot.end
      }));
    });
    
    // Explicitly cast to literal type
    const position: 'HOD' | 'Regular' = values.position === "HOD" ? "HOD" : "Regular";
    
    console.log("Submitting form with position:", position, "Type:", typeof position);
    
    const faculty: Faculty = {
      id: editFaculty?.id || uuidv4(),
      name: values.name,
      position: position, // Using the explicitly typed value
      subjects: values.subjects,
      availability: typedAvailability,
    };
    
    // Log the exact faculty object being saved
    console.log("Faculty object being saved:", JSON.stringify(faculty));
    
    onSave(faculty);
    form.reset();
    setAvailabilityDays([]);
  }

  // Load availability days when editing
  useEffect(() => {
    if (editFaculty) {
      const days = Object.keys(editFaculty.availability);
      setAvailabilityDays(days);
    }
  }, [editFaculty]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{editFaculty ? "Edit Faculty" : "Add New Faculty"}</CardTitle>
        <CardDescription>
          Enter faculty details and their availability.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Faculty Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter faculty name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {POSITIONS.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjects"
              render={() => (
                <FormItem>
                  <FormLabel>Subjects</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    {subjects.map((subject) => (
                      <FormField
                        key={subject.id}
                        control={form.control}
                        name="subjects"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={subject.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(subject.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, subject.id]);
                                    } else {
                                      field.onChange(
                                        currentValue.filter((value) => value !== subject.id)
                                      );
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {subject.name} {subject.isLab ? "(Lab)" : ""}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Availability</FormLabel>
              <div className="mt-2 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={availabilityDays.includes(day) ? "default" : "outline"}
                      onClick={() => toggleDay(day)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>

                {availabilityDays.map((day) => (
                  <div key={day} className="p-4 border rounded-md">
                    <h3 className="font-medium mb-2">{day}</h3>
                    <TimePickerDemo
                      value={(form.getValues(`availability.${day}`) as TimeSlot[]) || []}
                      onChange={(slots) => setTimeSlots(day, slots)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">
              {editFaculty ? "Update Faculty" : "Add Faculty"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
