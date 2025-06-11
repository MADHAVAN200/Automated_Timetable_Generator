import { useEffect, useState } from "react";
import { Faculty, Subject } from "@/types";
import { getAppData, saveFaculty, deleteFaculty } from "@/utils/storage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FacultyForm } from "@/components/FacultyForm";
import { Edit, Trash2, Plus } from "lucide-react";
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
import { useToast } from "@/components/ui/use-toast";

const FacultyManagement = () => {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | undefined>(undefined);
  const [deletingFaculty, setDeletingFaculty] = useState<Faculty | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await getAppData();
        setFaculties(data.faculties);
        setSubjects(data.subjects);
      } catch (error) {
        console.error("Error loading faculty data:", error);
        toast({
          variant: "destructive",
          title: "Error loading data",
          description: "Failed to load faculty data from the database."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);

  const handleSaveFaculty = async (faculty: Faculty) => {
    try {
      const position: 'HOD' | 'Regular' = faculty.position === 'HOD' ? 'HOD' : 'Regular';
      
      const validatedFaculty: Faculty = {
        ...faculty,
        id: faculty.id,
        name: faculty.name,
        position: position,
        subjects: faculty.subjects || [],
        availability: faculty.availability || {}
      };
      
      console.log("About to save faculty with position:", validatedFaculty.position);
      console.log("Position type:", typeof validatedFaculty.position);
      console.log("Complete faculty data:", JSON.stringify(validatedFaculty));
      
      await saveFaculty(validatedFaculty);
      
      if (editingFaculty) {
        setFaculties(prev => prev.map(f => f.id === validatedFaculty.id ? validatedFaculty : f));
        setEditingFaculty(undefined);
      } else {
        setFaculties(prev => [...prev, validatedFaculty]);
        setIsAdding(false);
      }
      
      toast({
        title: `Faculty ${editingFaculty ? 'updated' : 'added'}`,
        description: `${validatedFaculty.name} was successfully ${editingFaculty ? 'updated' : 'added'}.`
      });
    } catch (error) {
      console.error("Error saving faculty:", error);
      toast({
        variant: "destructive",
        title: "Error saving faculty",
        description: "Failed to save faculty to the database. Please check the console for details."
      });
    }
  };

  const handleDeleteFaculty = async (id: string) => {
    try {
      await deleteFaculty(id);
      setFaculties(prev => prev.filter(f => f.id !== id));
      setDeletingFaculty(undefined);
      
      toast({
        title: "Faculty deleted",
        description: "Faculty was successfully deleted."
      });
    } catch (error) {
      console.error("Error deleting faculty:", error);
      toast({
        variant: "destructive",
        title: "Error deleting faculty",
        description: "Failed to delete faculty from the database."
      });
    }
  };

  const getSubjectNamesForFaculty = (faculty: Faculty) => {
    return faculty.subjects
      .map(subId => subjects.find(s => s.id === subId)?.name || "")
      .filter(name => name !== "")
      .join(", ");
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Faculty Management</h1>
        {!isAdding && !editingFaculty && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Faculty
          </Button>
        )}
      </div>

      {isAdding || editingFaculty ? (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingFaculty ? "Edit Faculty" : "Add New Faculty"}
            </h2>
            <Button 
              variant="ghost" 
              onClick={() => {
                setIsAdding(false);
                setEditingFaculty(undefined);
              }}
            >
              Cancel
            </Button>
          </div>
          <FacultyForm 
            subjects={subjects} 
            onSave={handleSaveFaculty} 
            editFaculty={editingFaculty}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {faculties.length === 0 ? (
          <div className="col-span-full text-center p-8 border border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">No faculty members added yet.</p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Your First Faculty
            </Button>
          </div>
        ) : (
          faculties.map((faculty) => (
            <Card key={faculty.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{faculty.name}</CardTitle>
                    <CardDescription>{faculty.position}</CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingFaculty(faculty)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingFaculty(faculty)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <h3 className="text-sm font-medium">Subjects</h3>
                    <p className="text-sm text-muted-foreground">
                      {getSubjectNamesForFaculty(faculty) || "No subjects assigned"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Availability</h3>
                    <p className="text-sm text-muted-foreground">
                      {Object.keys(faculty.availability).length > 0
                        ? Object.keys(faculty.availability).join(", ")
                        : "No availability set"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!deletingFaculty} onOpenChange={(open) => !open && setDeletingFaculty(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the faculty member "{deletingFaculty?.name}" and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFaculty && handleDeleteFaculty(deletingFaculty.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FacultyManagement;
