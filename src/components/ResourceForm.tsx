
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resource } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { v4 as uuidv4 } from "uuid";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Resource name must be at least 2 characters.",
  }),
  type: z.enum(["classroom", "lab"]),
  capacity: z.number().min(1, {
    message: "Capacity must be at least 1.",
  }),
});

interface ResourceFormProps {
  onSave: (resource: Resource) => void;
  editResource?: Resource;
}

export const ResourceForm = ({ onSave, editResource }: ResourceFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editResource?.name || "",
      type: editResource?.type || "classroom",
      capacity: editResource?.capacity || 30,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const resource: Resource = {
      id: editResource?.id || uuidv4(),
      name: values.name,
      type: values.type,
      capacity: values.capacity,
    };
    onSave(resource);
    form.reset({
      name: "",
      type: "classroom",
      capacity: 30,
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{editResource ? "Edit Resource" : "Add New Resource"}</CardTitle>
        <CardDescription>
          Enter resource details (classrooms, labs, etc.)
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
                  <FormLabel>Resource Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Room 101, Lab A" {...field} />
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
                  <FormLabel>Resource Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="classroom">Classroom</SelectItem>
                      <SelectItem value="lab">Laboratory</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter capacity"
                      {...field}
                      onChange={(e) => {
                        field.onChange(parseInt(e.target.value) || 0);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of students the resource can accommodate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              {editResource ? "Update Resource" : "Add Resource"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
