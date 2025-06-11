import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AppData,
  Faculty, 
  Subject, 
  ClassBatch, 
  Resource
} from "@/types";
import { getAppData, saveClass, saveTimetableEntry } from "@/utils/storage";
import { generateTimetable } from "@/utils/timetableGenerator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClassForm } from "@/components/ClassForm";
import { 
  BookOpen, 
  Users, 
  School, 
  CalendarDays, 
  Plus, 
  ChevronRight 
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Dashboard = () => {
  const [appData, setAppData] = useState<AppData>({
    faculties: [],
    subjects: [],
    classes: [],
    resources: [],
    timetable: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Load data from Supabase
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await getAppData();
        setAppData(data);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          variant: "destructive",
          title: "Error loading data",
          description: "Failed to load data from the database."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);

  const addNewClass = async (newClass: ClassBatch) => {
    try {
      await saveClass(newClass);
      // Reload data after adding a new class
      const data = await getAppData();
      setAppData(data);
      toast({
        title: "Class added",
        description: `${newClass.name} was successfully added.`
      });
    } catch (error) {
      console.error("Error adding class:", error);
      toast({
        variant: "destructive",
        title: "Error adding class",
        description: "Failed to add the class to the database."
      });
    }
  };

  const generateNewTimetable = async () => {
    if (!appData.faculties.length || !appData.subjects.length || !appData.classes.length || !appData.resources.length) {
      toast({
        variant: "destructive",
        title: "Cannot generate timetable",
        description: "Please add faculty, subjects, classes, and resources before generating a timetable."
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      // Generate the timetable
      const newTimetable = await generateTimetable(
        appData.faculties,
        appData.subjects,
        appData.classes,
        appData.resources
      );

      // Update local state with the resolved timetable data
      setAppData(prev => ({
        ...prev,
        timetable: newTimetable
      }));

      // Save timetable entries to Supabase
      for (const entry of newTimetable) {
        await saveTimetableEntry(entry);
      }

      navigate("/timetable");
      toast({
        title: "Timetable generated",
        description: "Timetable was successfully generated and saved."
      });
    } catch (error) {
      console.error("Error generating timetable:", error);
      toast({
        variant: "destructive",
        title: "Error generating timetable",
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading dashboard data...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Timetable Generator Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <Users className="mr-2 h-5 w-5" /> Faculty
            </CardTitle>
            <CardDescription>
              Manage faculty and their availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{appData.faculties.length}</p>
            <p className="text-sm text-muted-foreground">Faculty members</p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="ghost" 
              className="w-full justify-between"
              onClick={() => navigate("/faculty")}
            >
              Manage Faculty <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <BookOpen className="mr-2 h-5 w-5" /> Subjects
            </CardTitle>
            <CardDescription>
              Manage subjects and lab requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{appData.subjects.length}</p>
            <p className="text-sm text-muted-foreground">
              Subjects ({appData.subjects.filter(s => s.isLab).length} labs)
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="ghost" 
              className="w-full justify-between"
              onClick={() => navigate("/subjects")}
            >
              Manage Subjects <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <School className="mr-2 h-5 w-5" /> Resources
            </CardTitle>
            <CardDescription>
              Manage classrooms and lab resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{appData.resources.length}</p>
            <p className="text-sm text-muted-foreground">
              Resources ({appData.resources.filter(r => r.type === 'lab').length} labs)
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="ghost" 
              className="w-full justify-between"
              onClick={() => navigate("/resources")}
            >
              Manage Resources <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <CalendarDays className="mr-2 h-5 w-5" /> Timetable
            </CardTitle>
            <CardDescription>
              Generate and view timetables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{appData.classes.length}</p>
            <p className="text-sm text-muted-foreground">Classes to schedule</p>
          </CardContent>
          <CardFooter>
            <Button
              variant={appData.timetable.length > 0 ? "ghost" : "default"}
              className="w-full justify-between"
              onClick={() => navigate("/timetable")}
            >
              View Timetable <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Add New Class</h2>
          <ClassForm 
            subjects={appData.subjects} 
            onSave={addNewClass} 
          />
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold mb-4">Generate Timetable</h2>
          <Card>
            <CardHeader>
              <CardTitle>Ready to create a timetable?</CardTitle>
              <CardDescription>
                Make sure you've added all faculty, subjects, classes, and resources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    appData.faculties.length > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {appData.faculties.length > 0 ? "✓" : "!"}
                  </div>
                  <span className="ml-2">
                    {appData.faculties.length} Faculty members added
                  </span>
                </div>
                
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    appData.subjects.length > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {appData.subjects.length > 0 ? "✓" : "!"}
                  </div>
                  <span className="ml-2">
                    {appData.subjects.length} Subjects added
                  </span>
                </div>
                
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    appData.classes.length > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {appData.classes.length > 0 ? "✓" : "!"}
                  </div>
                  <span className="ml-2">
                    {appData.classes.length} Classes added
                  </span>
                </div>
                
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    appData.resources.length > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {appData.resources.length > 0 ? "✓" : "!"}
                  </div>
                  <span className="ml-2">
                    {appData.resources.length} Resources added
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                disabled={!appData.faculties.length || !appData.subjects.length || !appData.classes.length || !appData.resources.length}
                onClick={generateNewTimetable}
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate Timetable
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
