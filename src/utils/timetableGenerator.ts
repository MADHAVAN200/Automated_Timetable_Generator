
import { 
  Faculty, 
  Subject, 
  ClassBatch, 
  Resource, 
  TimetableEntry
} from '@/types';
import { supabase } from "@/integrations/supabase/client";

export const generateTimetable = async (
  faculties: Faculty[],
  subjects: Subject[],
  classes: ClassBatch[],
  resources: Resource[],
  constraints: any = {}
): Promise<TimetableEntry[]> => {
  try {
    console.log("Starting timetable generation with constraints:", constraints);
    
    // Call Edge Function to generate timetable
    const { data, error } = await supabase.functions.invoke('generate-timetable', {
      body: {
        faculties,
        subjects,
        classes,
        resources,
        constraints: {
          lecturesPerSubject: constraints.lecturesPerSubject || 3,
          noFirstLectureForHOD: constraints.noFirstLectureForHOD !== false,
          maxLecturesPerFacultyPerDay: constraints.maxLecturesPerFacultyPerDay || 1,
          labsOnlyAtStartOrEnd: constraints.labsOnlyAtStartOrEnd !== false,
          requireExactBatchLabAttendance: constraints.requireExactBatchLabAttendance !== false,
          prioritizeLectureDistribution: constraints.prioritizeLectureDistribution === true,
          generationAttempt: constraints.generationAttempt || 0,
          numberOfAttempts: constraints.numberOfAttempts || 10
        }
      }
    });

    if (error) {
      console.error("Error in Edge Function:", error);
      throw new Error(`Edge Function error: ${error.message}`);
    }

    if (!data?.timetable) {
      throw new Error("No timetable returned from Edge Function");
    }
    
    return data.timetable as TimetableEntry[];
  } catch (error) {
    console.error('Error generating timetable:', error);
    throw error;
  }
};

// Function to validate the generated timetable against constraints
export const validateTimetable = (
  timetable: TimetableEntry[],
  faculties: Faculty[],
  subjects: Subject[],
  classes: ClassBatch[]
): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // 1. Exactly 3 lectures per subject per week
  const subjectLectureCount: Record<string, Record<string, number>> = {};
  
  // Initialize counts
  classes.forEach(classObj => {
    subjectLectureCount[classObj.id] = {};
    classObj.subjects.forEach(subjectId => {
      const subject = subjects.find(s => s.id === subjectId);
      if (subject && (subject.type !== "Optional" || !subject.type)) {
        subjectLectureCount[classObj.id][subjectId] = 0;
      }
    });
  });
  
  // Count lectures
  timetable.forEach(entry => {
    if (!entry.batch) { // Regular lecture
      if (subjectLectureCount[entry.classId] && 
          subjectLectureCount[entry.classId][entry.subject] !== undefined) {
        subjectLectureCount[entry.classId][entry.subject]++;
      }
    }
  });
  
  // Check for violations
  classes.forEach(classObj => {
    Object.entries(subjectLectureCount[classObj.id] || {}).forEach(([subjectId, count]) => {
      const subject = subjects.find(s => s.id === subjectId);
      // Skip optional subjects from the exact 3 lecture requirement
      if (subject && subject.type === "Optional") {
        return;
      }
      
      if (count !== 3) {
        const subjectName = subject?.name || subjectId;
        issues.push(`Subject "${subjectName}" has ${count} lectures for class ${classObj.name}, should have exactly 3`);
      }
    });
  });
  
  // 2. HODs don't have first lectures
  timetable.forEach(entry => {
    const faculty = faculties.find(f => f.id === entry.faculty);
    if (faculty?.position === 'HOD' && entry.timeSlot.start === '09:15' && !entry.batch) {
      issues.push(`HOD ${faculty.name} has first lecture on ${entry.day}`);
    }
  });
  
  // 3. Each batch must attend every lab subject exactly once per week
  const batchLabAttendance: Record<string, Record<string, Record<string, number>>> = {};
  
  // Initialize counts
  classes.forEach(classObj => {
    batchLabAttendance[classObj.id] = {};
    
    const labSubjects = subjects.filter(s => 
      s.isLab && classObj.subjects.includes(s.id) && s.type !== "Optional"
    );
    
    labSubjects.forEach(subject => {
      batchLabAttendance[classObj.id][subject.id] = {};
      (classObj.batches || ['B1', 'B2', 'B3']).forEach(batch => {
        batchLabAttendance[classObj.id][subject.id][batch] = 0;
      });
    });
  });
  
  // Count lab attendance
  timetable.forEach(entry => {
    if (entry.batch) { // Lab session
      if (batchLabAttendance[entry.classId] && 
          batchLabAttendance[entry.classId][entry.subject] && 
          batchLabAttendance[entry.classId][entry.subject][entry.batch] !== undefined) {
        batchLabAttendance[entry.classId][entry.subject][entry.batch]++;
      }
    }
  });
  
  // Check for violations
  classes.forEach(classObj => {
    const labSubjects = subjects.filter(s => 
      s.isLab && classObj.subjects.includes(s.id) && s.type !== "Optional"
    );
    
    labSubjects.forEach(subject => {
      (classObj.batches || ['B1', 'B2', 'B3']).forEach(batch => {
        const count = batchLabAttendance[classObj.id]?.[subject.id]?.[batch] || 0;
        if (count !== 1) {
          issues.push(`Batch ${batch} of class ${classObj.name} has ${count} labs for ${subject.name}, should have exactly 1`);
        }
      });
    });
  });
  
  // 4. Each faculty should have at most 1 lecture per day
  const facultyLecturesPerDay: Record<string, Record<string, number>> = {};
  
  // Initialize counts
  faculties.forEach(faculty => {
    facultyLecturesPerDay[faculty.id] = {};
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
      facultyLecturesPerDay[faculty.id][day] = 0;
    });
  });
  
  // Count lectures per faculty per day
  timetable.forEach(entry => {
    if (!entry.batch) { // Regular lecture
      if (facultyLecturesPerDay[entry.faculty] && 
          facultyLecturesPerDay[entry.faculty][entry.day] !== undefined) {
        facultyLecturesPerDay[entry.faculty][entry.day]++;
      }
    }
  });
  
  // Check for violations
  faculties.forEach(faculty => {
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
      const count = facultyLecturesPerDay[faculty.id]?.[day] || 0;
      if (count > 1) {
        issues.push(`Faculty ${faculty.name} has ${count} lectures on ${day}, should have at most 1`);
      }
    });
  });
  
  return {
    valid: issues.length === 0,
    issues
  };
};
