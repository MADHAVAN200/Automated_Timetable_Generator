import { useEffect, useState } from "react";
import { Faculty, Subject } from "@/types";
import { getAppData, saveSubject, deleteSubject } from "@/utils/storage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubjectForm } from "@/components/SubjectForm";
import { Edit, Trash2, Plus, Beaker, BookOpen } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const SubjectManagement = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | undefined>(undefined);
  const [deletingSubject, setDeletingSubject] = useState<Subject | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await getAppData();
        setSubjects(data.subjects);
        setFaculties(data.faculties);
      } catch (error) {
        console.error("Error loading subject data:", error);
        toast({
          variant: "destructive",
          title: "Error loading data",
          description: "Failed to load subject data from the database."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);

  const handleSaveSubject = async (subject: Subject) => {
    try {
      console.log("Saving subject:", subject);
      
      await saveSubject(subject);
      
      if (editingSubject) {
        setSubjects(prev => prev.map(s => s.id === subject.id ? subject : s));
        setEditingSubject(undefined);
      } else {
        setSubjects(prev => [...prev, subject]);
        setIsAdding(false);
      }
      
      toast({
        title: `Subject ${editingSubject ? 'updated' : 'added'}`,
        description: `${subject.name} was successfully ${editingSubject ? 'updated' : 'added'}.`
      });
    } catch (error) {
      console.error("Error saving subject:", error);
      toast({
        variant: "destructive",
        title: "Error saving subject",
        description: "Failed to save subject to the database. The subject type field may not be supported."
      });
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await deleteSubject(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
      setDeletingSubject(undefined);
      
      toast({
        title: "Subject deleted",
        description: "Subject was successfully deleted."
      });
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast({
        variant: "destructive",
        title: "Error deleting subject",
        description: "Failed to delete subject from the database."
      });
    }
  };

  const getFacultyNamesForSubject = (subject: Subject) => {
    return subject.facultyIds
      .map(facId => faculties.find(f => f.id === facId)?.name || "")
      .filter(name => name !== "")
      .join(", ");
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Subject Management</h1>
        {!isAdding && !editingSubject && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Subject
          </Button>
        )}
      </div>

      {isAdding || editingSubject ? (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingSubject ? "Edit Subject" : "Add New Subject"}
            </h2>
            <Button 
              variant="ghost" 
              onClick={() => {
                setIsAdding(false);
                setEditingSubject(undefined);
              }}
            >
              Cancel
            </Button>
          </div>
          <SubjectForm 
            faculties={faculties} 
            onSave={handleSaveSubject} 
            editSubject={editingSubject}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.length === 0 ? (
          <div className="col-span-full text-center p-8 border border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">No subjects added yet.</p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Your First Subject
            </Button>
          </div>
        ) : (
          subjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    {subject.isLab ? (
                      <Beaker className="mr-2 h-5 w-5 text-blue-500" />
                    ) : (
                      <BookOpen className="mr-2 h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <CardTitle>{subject.name}</CardTitle>
                      <CardDescription className="flex flex-wrap gap-2 mt-1">
                        <Badge variant={subject.isLab ? "default" : "outline"}>
                          {subject.isLab ? "Lab" : "Theory"}
                        </Badge>
                        <Badge variant={subject.type === "Optional" ? "secondary" : "outline"}>
                          {subject.type}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingSubject(subject)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingSubject(subject)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div>
                  <h3 className="text-sm font-medium">Assigned Faculty</h3>
                  <p className="text-sm text-muted-foreground">
                    {getFacultyNamesForSubject(subject) || "No faculty assigned"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!deletingSubject} onOpenChange={(open) => !open && setDeletingSubject(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the subject "{deletingSubject?.name}" and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSubject && handleDeleteSubject(deletingSubject.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubjectManagement;
