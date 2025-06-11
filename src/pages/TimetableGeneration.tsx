import { useEffect, useState } from "react";
import { TimetableEntry, Faculty, Subject, ClassBatch, Resource } from "@/types";
import { getAppData, saveTimetableEntry } from "@/utils/storage";
import { generateTimetable, validateTimetable } from "@/utils/timetableGenerator";
import { Button } from "@/components/ui/button";
import { TimetableView } from "@/components/TimetableView";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";

const TimetableGeneration = () => {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassBatch[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const [generationMode, setGenerationMode] = useState<"balanced" | "prioritize-lectures" | "maximum-attempts">("maximum-attempts");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await getAppData();
        setFaculties(data.faculties);
        setSubjects(data.subjects);
        setClasses(data.classes);
        setResources(data.resources);
        setTimetable(data.timetable);
        setError(null);
      } catch (error) {
        console.error("Error loading timetable data:", error);
        setError("Failed to load data from the database.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleGenerateTimetable = async () => {
    setError(null);
    setValidationIssues([]);
    setIsGenerating(true);
    setGenerationAttempts(prev => prev + 1);

    if (faculties.length === 0) {
      setError("No faculty members added. Please add faculty members before generating a timetable.");
      setIsGenerating(false);
      return;
    }

    if (subjects.length === 0) {
      setError("No subjects added. Please add subjects before generating a timetable.");
      setIsGenerating(false);
      return;
    }

    if (classes.length === 0) {
      setError("No classes added. Please add classes before generating a timetable.");
      setIsGenerating(false);
      return;
    }

    try {
      const constraints = {
        lecturesPerSubject: 3,
        noFirstLectureForHOD: true,
        maxLecturesPerFacultyPerDay: 1,
        labsOnlyAtStartOrEnd: true,
        requireExactBatchLabAttendance: true,
        generationAttempt: generationAttempts,
        numberOfAttempts: generationMode === "maximum-attempts" ? 20 : 10,
        prioritizeLectureDistribution: generationMode === "prioritize-lectures",
      };

      const newTimetable = await generateTimetable(faculties, subjects, classes, resources, constraints);
      
      if (!Array.isArray(newTimetable)) {
        throw new Error("Invalid timetable format returned from server");
      }
      
      const validatedTimetable = newTimetable.map(entry => {
        if (!entry.timeSlot || typeof entry.timeSlot !== 'object') {
          console.warn('Missing timeSlot in entry, creating default', entry);
          return {
            ...entry,
            timeSlot: { start: "00:00", end: "00:00" }
          };
        }
        
        if (!entry.timeSlot.start || !entry.timeSlot.end) {
          console.warn('Missing start/end in timeSlot, fixing', entry);
          return {
            ...entry,
            timeSlot: { 
              start: entry.timeSlot.start || "00:00", 
              end: entry.timeSlot.end || "00:00" 
            }
          };
        }
        
        if (!entry.resource) {
          console.warn('Missing resource ID in entry, assigning default', entry);
          const subject = subjects.find(s => s.id === entry.subject);
          
          const defaultResource = resources.find(r => 
            subject?.isLab ? r.type === 'lab' : r.type === 'classroom'
          );
          
          if (defaultResource) {
            return {
              ...entry,
              resource: defaultResource.id
            };
          } else {
            const anyResource = resources.length > 0 ? resources[0].id : '';
            console.warn('No matching resource type, using first available resource', anyResource);
            
            return {
              ...entry,
              resource: anyResource
            };
          }
        }
        
        return entry;
      });
      
      setTimetable(validatedTimetable);

      try {
        const { error: deleteError } = await supabase
          .from('timetable_entries')
          .delete()
          .not('id', 'is', null);
        
        if (deleteError) {
          console.error("Error deleting existing timetable entries:", deleteError);
        }
        
        const savePromises = validatedTimetable.map(entry => saveTimetableEntry(entry));
        await Promise.all(savePromises);
      } catch (saveError) {
        console.error("Error saving timetable entries:", saveError);
        toast({
          variant: "destructive",
          title: "Error saving timetable",
          description: "The timetable was generated but could not be saved to the database."
        });
      }
      
      const validation = validateTimetable(validatedTimetable, faculties, subjects, classes);
      if (!validation.valid) {
        setValidationIssues(validation.issues);
        
        const subjectLectureIssues = validation.issues.filter(issue => 
          issue.includes("lectures for class") && issue.includes("should have exactly 4")
        );
        
        const labBatchIssues = validation.issues.filter(issue => 
          issue.includes("batch") && issue.includes("labs for") && issue.includes("should have exactly 1")
        );
        
        if (labBatchIssues.length > 0) {
          toast({
            variant: "default",
            title: "Timetable generated with lab attendance issues",
            description: `Some batches don't have all required labs. Generated with ${validation.issues.length} constraint violations.`
          });
        } else if (subjectLectureIssues.length > 0) {
          toast({
            variant: "default",
            title: "Timetable generated with lecture distribution issues",
            description: `Some subjects don't have exactly 4 lectures. Generated ${validatedTimetable.length} entries with ${validation.issues.length} constraint violations.`
          });
        } else {
          toast({
            variant: "default",
            title: "Timetable generated with minor issues",
            description: `Generated ${validatedTimetable.length} entries with ${validation.issues.length} constraint violations.`
          });
        }
      } else {
        toast({
          title: "Timetable generated successfully",
          description: `Successfully generated ${validatedTimetable.length} timetable entries meeting all constraints.`
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error generating timetable: ${errorMessage}`);
      toast({
        variant: "destructive",
        title: "Error generating timetable",
        description: errorMessage
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading timetable data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Timetable Generation</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
          >
            Dashboard
          </Button>
          <Button
            onClick={handleGenerateTimetable}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Generating...
              </>
            ) : (
              "Generate New Timetable"
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Generation Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-2">Optimization Strategy:</p>
            <ToggleGroup 
              type="single"
              value={generationMode}
              onValueChange={(value) => value && setGenerationMode(value as any)}
              className="justify-start"
            >
              <ToggleGroupItem value="balanced" aria-label="Balanced generation">
                Balanced
              </ToggleGroupItem>
              <ToggleGroupItem value="prioritize-lectures" aria-label="Prioritize lectures">
                Prioritize Lectures
              </ToggleGroupItem>
              <ToggleGroupItem value="maximum-attempts" aria-label="Maximum attempts">
                Maximum Attempts
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground mt-2">
              {generationMode === "balanced" && "Generate a timetable that balances all constraints equally."}
              {generationMode === "prioritize-lectures" && "Give higher priority to ensuring exactly 4 lectures per subject."}
              {generationMode === "maximum-attempts" && "Try more generation attempts to find the optimal solution (takes longer)."}
            </p>
          </div>
        </CardContent>
      </Card>

      {validationIssues.length > 0 && (
        <Card className="mb-4 border-yellow-300">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Timetable Generated with Constraint Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-sm">The following constraints could not be fully satisfied:</p>
            <div className="max-h-40 overflow-y-auto">
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                {validationIssues.slice(0, 10).map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
                {validationIssues.length > 10 && (
                  <li className="font-medium">And {validationIssues.length - 10} more issues...</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-white rounded-lg shadow-sm">
        {timetable.length > 0 ? (
          <TimetableView
            timetable={timetable}
            classes={classes}
            subjects={subjects}
            faculties={faculties}
            resources={resources}
            onRegenerate={handleGenerateTimetable}
          />
        ) : (
          <div className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No timetable generated yet. Click the button above to create a new timetable.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableGeneration;
