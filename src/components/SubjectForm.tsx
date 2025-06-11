import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Faculty, Subject } from "@/types";
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
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { v4 as uuidv4 } from "uuid";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { SUBJECT_TYPES } from "@/utils/constants";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Subject name must be at least 2 characters.",
  }),
  isLab: z.boolean(),
  type: z.enum(['Regular', 'Optional']),
  facultyIds: z.array(z.string()),
});

interface SubjectFormProps {
  faculties: Faculty[];
  onSave: (subject: Subject) => void;
  editSubject?: Subject;
}

export const SubjectForm = ({ faculties, onSave, editSubject }: SubjectFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editSubject?.name || "",
      isLab: editSubject?.isLab || false,
      type: editSubject?.type || "Regular",
      facultyIds: editSubject?.facultyIds || [],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const subject: Subject = {
      id: editSubject?.id || uuidv4(),
      name: values.name,
      isLab: values.isLab,
      type: values.type,
      facultyIds: values.facultyIds,
    };
    onSave(subject);
    form.reset();
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{editSubject ? "Edit Subject" : "Add New Subject"}</CardTitle>
        <CardDescription>
          Enter subject details and assign faculty.
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
                  <FormLabel>Subject Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter subject name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUBJECT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Note: Subject type is for UI organization only and is not saved to the database.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isLab"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Laboratory Subject</FormLabel>
                    <FormDescription>
                      Mark if this subject requires lab sessions.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={form.watch("type") === "Optional"}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facultyIds"
              render={() => (
                <FormItem>
                  <FormLabel>Assign Faculty</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    {faculties.map((faculty) => (
                      <FormField
                        key={faculty.id}
                        control={form.control}
                        name="facultyIds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={faculty.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(faculty.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, faculty.id]);
                                    } else {
                                      field.onChange(
                                        currentValue.filter((value) => value !== faculty.id)
                                      );
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {faculty.name} ({faculty.position})
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

            <Button type="submit" className="w-full">
              {editSubject ? "Update Subject" : "Add Subject"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
