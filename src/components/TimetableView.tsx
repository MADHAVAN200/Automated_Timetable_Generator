import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  TimetableEntry, 
  Faculty, 
  Subject, 
  ClassBatch, 
  Resource 
} from "@/types";
import { DAYS_OF_WEEK, TIME_SLOTS } from "@/utils/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Download, RotateCcw } from "lucide-react";

interface TimetableViewProps {
  timetable: TimetableEntry[];
  classes: ClassBatch[];
  subjects: Subject[];
  faculties: Faculty[];
  resources: Resource[];
  onRegenerate: () => void;
}

export const TimetableView = ({
  timetable,
  classes,
  subjects,
  faculties,
  resources,
  onRegenerate,
}: TimetableViewProps) => {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [filteredTimetable, setFilteredTimetable] = useState<TimetableEntry[]>([]);
  const navigate = useNavigate();

  const getSubjectName = (id: string) => {
    const subject = subjects.find((s) => s.id === id);
    return subject ? subject.name : "Unknown Subject";
  };

  const getFacultyName = (id: string) => {
    const faculty = faculties.find((f) => f.id === id);
    return faculty ? faculty.name : "Unknown Faculty";
  };

  const getResourceName = (id: string) => {
    const resource = resources.find((r) => r.id === id);
    return resource ? resource.name : "Unknown Resource";
  };

  useEffect(() => {
    if (!selectedClass) {
      setFilteredTimetable([]);
      return;
    }

    let filtered = timetable.filter((entry) => entry.classId === selectedClass);

    if (selectedBatch !== "all") {
      filtered = filtered.filter(
        (entry) => entry.batch === null || entry.batch === selectedBatch
      );
    }

    setFilteredTimetable(filtered);
  }, [selectedClass, selectedBatch, timetable]);

  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  const timetableIssues = timetable.length === 0 
    ? ["No timetable has been generated yet."] 
    : [];

  const formatTimetableForCSV = () => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let csvContent = "";
    
    days.forEach(day => {
      if (csvContent) {
        csvContent += "\n\n";
      }
      csvContent += `${day}\n`;
      csvContent += "Time,Subject,Faculty,Room,Batch\n";
      
      const dayEntries = filteredTimetable
        .filter(entry => entry.day === day)
        .sort((a, b) => a.timeSlot.start.localeCompare(b.timeSlot.start));
      
      if (dayEntries.length > 0) {
        dayEntries.forEach(entry => {
          csvContent += `${entry.timeSlot.start}-${entry.timeSlot.end},`;
          csvContent += `${getSubjectName(entry.subject)},`;
          csvContent += `${getFacultyName(entry.faculty)},`;
          csvContent += `${getResourceName(entry.resource)},`;
          csvContent += `${entry.batch || 'All'}\n`;
        });
      } else {
        csvContent += "No classes scheduled\n";
      }
    });
    
    return csvContent;
  };

  const downloadTimetable = () => {
    if (filteredTimetable.length === 0) return;
    
    const csvContent = formatTimetableForCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const className = classes.find(c => c.id === selectedClass)?.name || 'timetable';
    const filename = `${className}-${selectedBatch === 'all' ? 'all-batches' : selectedBatch}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Timetable View</CardTitle>
        <CardDescription>
          View and filter the generated timetable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {timetableIssues.length > 0 ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Timetable Issues</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside">
                {timetableIssues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Class</label>
            <Select
              value={selectedClass}
              onValueChange={(value) => setSelectedClass(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Batch</label>
            <Select
              value={selectedBatch}
              onValueChange={(value) => setSelectedBatch(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                <SelectItem value="B1">Batch B1</SelectItem>
                <SelectItem value="B2">Batch B2</SelectItem>
                <SelectItem value="B3">Batch B3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={timetable.length === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" /> Regenerate
          </Button>
          <Button
            variant="outline"
            onClick={downloadTimetable}
            disabled={filteredTimetable.length === 0}
          >
            <Download className="h-4 w-4 mr-2" /> Download CSV
          </Button>
        </div>

        {classes.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-lg">
            <p className="text-muted-foreground">
              No classes have been added yet. Create a class to generate a timetable.
            </p>
            <Button 
              variant="default" 
              className="mt-4"
              onClick={() => navigate("/")}
            >
              Add Class
            </Button>
          </div>
        ) : filteredTimetable.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-lg">
            <p className="text-muted-foreground">
              No timetable entries found for the selected filters.
            </p>
            <Button 
              variant="default" 
              className="mt-4"
              onClick={onRegenerate}
            >
              Generate Timetable
            </Button>
          </div>
        ) : (
          <Tabs defaultValue={DAYS_OF_WEEK[0]}>
            <TabsList className="w-full justify-start overflow-auto">
              {DAYS_OF_WEEK.map((day) => (
                <TabsTrigger key={day} value={day}>
                  {day}
                </TabsTrigger>
              ))}
            </TabsList>
            {DAYS_OF_WEEK.map((day) => (
              <TabsContent key={day} value={day}>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-2 text-left">Time</th>
                        <th className="p-2 text-left">Subject</th>
                        <th className="p-2 text-left">Faculty</th>
                        <th className="p-2 text-left">Room</th>
                        {selectedBatch === "all" && (
                          <th className="p-2 text-left">Batch</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTimetable.filter((entry) => entry.day === day).length > 0 ? (
                        filteredTimetable
                          .filter((entry) => entry.day === day)
                          .sort((a, b) => a.timeSlot.start.localeCompare(b.timeSlot.start))
                          .map((entry, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2">
                                {entry.timeSlot.start}-{entry.timeSlot.end}
                              </td>
                              <td className="p-2">{getSubjectName(entry.subject)}</td>
                              <td className="p-2">{getFacultyName(entry.faculty)}</td>
                              <td className="p-2">{getResourceName(entry.resource)}</td>
                              {selectedBatch === "all" && (
                                <td className="p-2">{entry.batch || "All"}</td>
                              )}
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td 
                            colSpan={selectedBatch === "all" ? 5 : 4} 
                            className="p-4 text-center text-muted-foreground"
                          >
                            No entries for this day
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
