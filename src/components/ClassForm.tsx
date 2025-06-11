
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClassBatch, Subject } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { v4 as uuidv4 } from "uuid";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Class name must be at least 2 characters.",
  }),
  subjects: z.array(z.string()).min(1, {
    message: "Please select at least one subject.",
  }),
});

interface ClassFormProps {
  subjects: Subject[];
  onSave: (classBatch: ClassBatch) => void;
  editClass?: ClassBatch;
}

export const ClassForm = ({ subjects, onSave, editClass }: ClassFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editClass?.name || "",
      subjects: editClass?.subjects || [],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const classBatch: ClassBatch = {
      id: editClass?.id || uuidv4(),
      name: values.name,
      subjects: values.subjects,
      batches: ["B1", "B2", "B3"],
    };
    onSave(classBatch);
    form.reset();
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{editClass ? "Edit Class" : "Add New Class"}</CardTitle>
        <CardDescription>
          Enter class details and assign subjects.
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
                  <FormLabel>Class Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. CS-A, IT-B" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjects"
              render={() => (
                <FormItem>
                  <FormLabel>Subjects for this Class</FormLabel>
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

            <Button type="submit" className="w-full">
              {editClass ? "Update Class" : "Add Class"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
