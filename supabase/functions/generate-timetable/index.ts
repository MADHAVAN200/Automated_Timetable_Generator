import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Timetable generation with enhanced constraints based on specific requirements
const generateTimetable = (
  faculties: any[],
  subjects: any[],
  classes: any[],
  resources: any[],
  constraints: any = {}
) => {
  // Define days and time slots
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  
  // Time slots
  const TIME_SLOTS = [
    { start: "09:15", end: "10:15" },
    { start: "10:15", end: "11:15" },
    { start: "11:15", end: "12:15" },
    { start: "12:15", end: "13:05" }, // 50 min slot before lunch
    // Lunch Break: 13:05 - 13:35
    { start: "13:35", end: "14:35" },
    { start: "14:35", end: "15:35" }
  ];
  
  // Lab slots (2 hours each)
  const LAB_SLOTS = [
    { start: "09:15", end: "11:15" }, // Morning lab
    { start: "13:35", end: "15:35" }  // Afternoon lab
  ];

  console.log("Starting timetable generation with constraints:", constraints);
  
  // Helper function to shuffle an array
  const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };
  
  // Create an empty timetable
  let timetable: any[] = [];
  
  // Trackers for constraints
  // Track lectures per subject per class
  const subjectLectureCount: Record<string, Record<string, number>> = {};
  // Track faculty lectures per day
  const facultyLecturesPerDay: Record<string, Record<string, number>> = {};
  // Track batch lab sessions for each subject
  const batchLabCount: Record<string, Record<string, Record<string, number>>> = {};
  
  // Initialize counters
  classes.forEach(classObj => {
    subjectLectureCount[classObj.id] = {};
    subjects.forEach(subject => {
      subjectLectureCount[classObj.id][subject.id] = 0;
    });
    
    batchLabCount[classObj.id] = {};
    subjects.forEach(subject => {
      if (subject.isLab && subject.type !== "Optional") {
        batchLabCount[classObj.id][subject.id] = {};
        (classObj.batches || ['B1', 'B2', 'B3']).forEach(batch => {
          batchLabCount[classObj.id][subject.id][batch] = 0;
        });
      }
    });
  });
  
  faculties.forEach(faculty => {
    facultyLecturesPerDay[faculty.id] = {};
    DAYS.forEach(day => {
      facultyLecturesPerDay[faculty.id][day] = 0;
    });
  });
  
  // Helper functions
  const isFacultyAvailable = (faculty: any, day: string, timeSlot: any) => {
    // Check if faculty already has a lecture that day
    if (facultyLecturesPerDay[faculty.id][day] >= 1) {
      return false;
    }
    
    // Check faculty availability if specified
    if (faculty.availability && faculty.availability[day]) {
      const availableSlots = faculty.availability[day];
      return availableSlots.some((slot: any) => 
        slot.start <= timeSlot.start && slot.end >= timeSlot.end
      );
    }
    
    return true;
  };
  
  const isFacultyBooked = (facultyId: string, day: string, timeSlot: any) => {
    return timetable.some(entry => 
      entry.faculty === facultyId && 
      entry.day === day && 
      ((entry.timeSlot.start < timeSlot.end && entry.timeSlot.end > timeSlot.start) ||
       (entry.timeSlot.start === timeSlot.start || entry.timeSlot.end === timeSlot.end))
    );
  };
  
  const isClassBooked = (classId: string, day: string, timeSlot: any, batch: string | null = null) => {
    return timetable.some(entry => {
      if (entry.classId !== classId || entry.day !== day) {
        return false;
      }
      
      const hasTimeOverlap = 
        (entry.timeSlot.start < timeSlot.end && entry.timeSlot.end > timeSlot.start) ||
        (entry.timeSlot.start === timeSlot.start || entry.timeSlot.end === timeSlot.end);
        
      if (!hasTimeOverlap) {
        return false;
      }
      
      // Full class check
      if (batch === null) {
        return true;
      }
      
      // Batch specific check
      if (entry.batch === batch || entry.batch === null) {
        return true;
      }
      
      return false;
    });
  };
  
  // Get subjects that have a lab component
  const getLabSubjects = (classId: string) => {
    return subjects.filter(subject => 
      subject.isLab && 
      subject.type !== "Optional" &&
      (classes.find(c => c.id === classId)?.subjects || []).includes(subject.id)
    );
  };
  
  // Add a lab session
  const addLabSession = (day: string, labSlot: any, classObj: any, subject: any, batch: string, faculty: any) => {
    // Skip if faculty is already booked
    if (isFacultyBooked(faculty.id, day, labSlot)) {
      return false;
    }
    
    // Skip if class or batch is already booked
    if (isClassBooked(classObj.id, day, labSlot, batch)) {
      return false;
    }
    
    // Find an appropriate lab resource
    const labResource = resources.find(r => r.type === 'lab');
    const resourceId = labResource ? labResource.id : (resources.length > 0 ? resources[0].id : "");
    
    // Create lab entry with valid resource ID
    timetable.push({
      day,
      timeSlot: {
        start: labSlot.start,
        end: labSlot.end
      },
      subject: subject.id,
      faculty: faculty.id,
      resource: resourceId,
      classId: classObj.id,
      batch
    });
    
    // Track this lab session
    batchLabCount[classObj.id][subject.id][batch]++;
    
    return true;
  };
  
  // Add a lecture
  const addLecture = (day: string, timeSlot: any, classObj: any, subject: any, faculty: any) => {
    // Skip if faculty is already booked
    if (isFacultyBooked(faculty.id, day, timeSlot)) {
      return false;
    }
    
    // Skip if HOD faculty and this is first lecture
    if (faculty.position === "HOD" && timeSlot.start === "09:15") {
      return false;
    }
    
    // Skip if class is already booked
    if (isClassBooked(classObj.id, day, timeSlot)) {
      return false;
    }
    
    // Skip if we already have the maximum lectures for this subject
    // ENFORCING EXACTLY 3 LECTURES PER SUBJECT
    const targetLectures = constraints.lecturesPerSubject || 3;
    if (subjectLectureCount[classObj.id][subject.id] >= targetLectures) {
      return false;
    }
    
    // Find an appropriate classroom resource
    const classroomResource = resources.find(r => r.type === 'classroom');
    const resourceId = classroomResource ? classroomResource.id : (resources.length > 0 ? resources[0].id : "");
    
    // Create lecture entry with valid resource ID
    timetable.push({
      day,
      timeSlot: {
        start: timeSlot.start,
        end: timeSlot.end
      },
      subject: subject.id,
      faculty: faculty.id,
      resource: resourceId,
      classId: classObj.id,
      batch: null
    });
    
    // Track this lecture
    subjectLectureCount[classObj.id][subject.id]++;
    facultyLecturesPerDay[faculty.id][day]++;
    
    return true;
  };
  
  // Improved function to schedule lab sessions for each batch
  const scheduleLabSessions = () => {
    console.log("Scheduling lab sessions...");
    
    // Process each class separately
    classes.forEach(classObj => {
      // Get lab subjects for this class
      const labSubjects = getLabSubjects(classObj.id);
      if (labSubjects.length === 0) {
        console.log(`No lab subjects found for class ${classObj.name || classObj.id}`);
        return;
      }
      
      console.log(`Found ${labSubjects.length} lab subjects for class ${classObj.name || classObj.id}`);
      
      // For each batch, ensure they get each lab subject once
      const batches = classObj.batches || ['B1', 'B2', 'B3'];
      
      // Pre-plan lab assignments for each day to ensure all batches get all labs
      // Create a matrix of [day][slot][batch] -> subject assignments
      const labAssignmentPlan: Record<string, Record<string, Record<string, { 
        subject: any, 
        faculty: any 
      } | null>>> = {};
      
      // Initialize the lab assignment plan
      DAYS.forEach(day => {
        labAssignmentPlan[day] = {};
        LAB_SLOTS.forEach(slot => {
          labAssignmentPlan[day][`${slot.start}-${slot.end}`] = {};
          batches.forEach(batch => {
            labAssignmentPlan[day][`${slot.start}-${slot.end}`][batch] = null;
          });
        });
      });
      
      // Count how many labs each batch still needs for each subject
      const batchNeedsLab: Record<string, Record<string, number>> = {};
      batches.forEach(batch => {
        batchNeedsLab[batch] = {};
        labSubjects.forEach(subject => {
          batchNeedsLab[batch][subject.id] = 1; // Each batch needs exactly 1 lab for each subject
        });
      });
      
      // First, try to generate a full lab schedule (all batches, all subjects)
      // Shuffle days and slots for randomness
      const shuffledDays = shuffleArray([...DAYS]);
      
      // For each day and lab slot, try to schedule labs for all batches
      let hasChanges = true;
      let attempts = 0;
      const MAX_ATTEMPTS = 50;
      
      while (hasChanges && attempts < MAX_ATTEMPTS) {
        hasChanges = false;
        attempts++;
        
        // Count remaining labs needed
        let remainingLabs = 0;
        batches.forEach(batch => {
          labSubjects.forEach(subject => {
            if (batchNeedsLab[batch][subject.id] > 0) {
              remainingLabs++;
            }
          });
        });
        
        if (remainingLabs === 0) break;
        
        console.log(`Attempt ${attempts}: ${remainingLabs} labs still need to be scheduled`);
        
        // For each day and lab slot
        for (const day of shuffledDays) {
          for (const labSlot of LAB_SLOTS) {
            const slotKey = `${labSlot.start}-${labSlot.end}`;
            
            // Check if this slot is already fully booked
            const slotBookings = Object.values(labAssignmentPlan[day][slotKey]);
            if (slotBookings.every(b => b !== null)) {
              continue; // Skip if all batches are already assigned in this slot
            }
            
            // For each batch, try to assign a lab
            const batchAssignments: Record<string, {subject: any, faculty: any}> = {};
            const batchesForThisSlot = shuffleArray([...batches]);
            
            for (const batch of batchesForThisSlot) {
              // Skip if batch already has an assignment in this slot
              if (labAssignmentPlan[day][slotKey][batch] !== null) {
                continue;
              }
              
              // Find subjects this batch still needs labs for
              const neededSubjects = labSubjects.filter(subject => 
                batchNeedsLab[batch][subject.id] > 0
              );
              
              if (neededSubjects.length === 0) continue;
              
              // Try each subject (shuffle for randomness)
              const shuffledSubjects = shuffleArray(neededSubjects);
              
              for (const subject of shuffledSubjects) {
                // Make sure other batches aren't already using this subject in this slot
                if (Object.values(batchAssignments).some(a => a.subject.id === subject.id)) {
                  continue;
                }
                
                // Find faculties that can teach this subject
                const facultiesForSubject = faculties.filter(f => 
                  f.subjects.includes(subject.id)
                );
                
                if (facultiesForSubject.length === 0) continue;
                
                // Try each faculty
                const shuffledFaculties = shuffleArray(facultiesForSubject);
                
                for (const faculty of shuffledFaculties) {
                  // Skip HOD for first slot
                  if (faculty.position === "HOD" && labSlot.start === "09:15") {
                    continue;
                  }
                  
                  // Check if faculty is already booked in this slot
                  if (Object.values(batchAssignments).some(a => a.faculty.id === faculty.id)) {
                    continue;
                  }
                  
                  // Check if faculty is already booked elsewhere in the timetable
                  if (isFacultyBooked(faculty.id, day, labSlot)) {
                    continue;
                  }
                  
                  // Found a valid assignment
                  batchAssignments[batch] = { subject, faculty };
                  break;
                }
                
                if (batchAssignments[batch]) break;
              }
            }
            
            // Apply the assignments if we have at least 2 batches assigned
            // (This helps ensure slots are utilized efficiently)
            if (Object.keys(batchAssignments).length >= 2) {
              for (const [batch, assignment] of Object.entries(batchAssignments)) {
                labAssignmentPlan[day][slotKey][batch] = assignment;
                batchNeedsLab[batch][assignment.subject.id]--;
                hasChanges = true;
              }
            }
          }
        }
      }
      
      // Now execute the plan - add all the scheduled lab sessions to the timetable
      DAYS.forEach(day => {
        LAB_SLOTS.forEach(labSlot => {
          const slotKey = `${labSlot.start}-${labSlot.end}`;
          const assignments = labAssignmentPlan[day][slotKey];
          
          for (const [batch, assignment] of Object.entries(assignments)) {
            if (assignment) {
              addLabSession(
                day, 
                labSlot, 
                classObj, 
                assignment.subject, 
                batch, 
                assignment.faculty
              );
            }
          }
        });
      });
      
      // Check if any batch still needs labs
      let missingLabs = false;
      batches.forEach(batch => {
        labSubjects.forEach(subject => {
          if (batchNeedsLab[batch][subject.id] > 0) {
            console.log(`⚠️ Batch ${batch} still needs a lab for ${subject.name || subject.id}`);
            missingLabs = true;
            
            // Last-ditch effort: Try to find ANY slot where we can fit this lab
            for (const day of DAYS) {
              if (missingLabs) {
                for (const labSlot of LAB_SLOTS) {
                  if (missingLabs) {
                    // Find a faculty
                    const facultiesForSubject = faculties.filter(f => 
                      f.subjects.includes(subject.id) &&
                      !isFacultyBooked(f.id, day, labSlot) &&
                      !(f.position === "HOD" && labSlot.start === "09:15")
                    );
                    
                    for (const faculty of facultiesForSubject) {
                      // Check if the batch is available
                      if (!isClassBooked(classObj.id, day, labSlot, batch)) {
                        if (addLabSession(day, labSlot, classObj, subject, batch, faculty)) {
                          console.log(`✅ Successfully added emergency lab for batch ${batch}, subject ${subject.name || subject.id}`);
                          batchNeedsLab[batch][subject.id]--;
                          missingLabs = batchNeedsLab[batch][subject.id] > 0;
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      });
    });
    
    // Log lab schedule status
    classes.forEach(classObj => {
      console.log(`Lab schedule for class ${classObj.name || classObj.id}:`);
      subjects.forEach(subject => {
        if (subject.isLab && classObj.subjects.includes(subject.id)) {
          console.log(`- ${subject.name || subject.id}:`);
          (classObj.batches || ['B1', 'B2', 'B3']).forEach(batch => {
            const count = batchLabCount[classObj.id][subject.id][batch] || 0;
            console.log(`  - Batch ${batch}: ${count} lab sessions`);
          });
        }
      });
    });
  };
  
  // Function to schedule lectures, ensuring each subject gets EXACTLY the target number of lectures per week
  const scheduleLectures = () => {
    console.log("Scheduling lectures...");
    
    // Get target lectures per subject from constraints (default to 3)
    const targetLecturesPerSubject = constraints.lecturesPerSubject || 3;
    console.log(`Target lectures per subject: ${targetLecturesPerSubject}`);
    
    // First, create a priority list of subjects for each class
    // This ensures all subjects get their fair share of lectures
    const classPrioritySubjects: Record<string, string[]> = {};
    
    classes.forEach(classObj => {
      // Get regular (non-lab) subjects for this class
      const regularSubjects = subjects.filter(subject => 
        classObj.subjects.includes(subject.id) && 
        (!subject.isLab || (subject.isLab && subject.type !== "Optional"))
      );
      
      // Initialize with all subjects in random order
      classPrioritySubjects[classObj.id] = shuffleArray(regularSubjects.map(s => s.id));
    });
    
    // Distribute lectures in phases to ensure fair distribution
    // Phase 1: Give each subject at least 1 lecture
    // Phase 2: Give each subject at least 2 lectures
    // Phase 3: Complete the allocation to reach exactly 3 lectures
    
    for (let phase = 1; phase <= targetLecturesPerSubject; phase++) {
      console.log(`\nScheduling Phase ${phase}: Ensuring each subject has at least ${phase} lectures`);
      
      classes.forEach(classObj => {
        // Get subjects that need more lectures in this phase
        const subjectsToSchedule = classPrioritySubjects[classObj.id].filter(subjectId => 
          subjectLectureCount[classObj.id][subjectId] < phase
        );
        
        if (subjectsToSchedule.length === 0) {
          console.log(`Class ${classObj.name || classObj.id} has all subjects with at least ${phase} lectures`);
          return;
        }
        
        console.log(`Class ${classObj.name || classObj.id} needs to schedule ${subjectsToSchedule.length} subjects in phase ${phase}`);
        
        // For each subject that needs more lectures
        for (const subjectId of subjectsToSchedule) {
          const subject = subjects.find(s => s.id === subjectId);
          if (!subject) continue;
          
          // Track days where this subject already has lectures
          const subjectDays = new Set(timetable
            .filter(entry => entry.classId === classObj.id && entry.subject === subjectId && entry.batch === null)
            .map(entry => entry.day)
          );
          
          // Try to add a lecture on a day where this subject doesn't yet have one
          let lectureAdded = false;
          
          // First try days where the subject doesn't have a lecture yet
          const daysWithoutLecture = DAYS.filter(day => !subjectDays.has(day));
          const shuffledDaysWithoutLecture = shuffleArray(daysWithoutLecture);
          
          for (const day of shuffledDaysWithoutLecture) {
            if (lectureAdded) break;
            
            // Try each time slot
            for (const timeSlot of shuffleArray(TIME_SLOTS)) {
              if (lectureAdded) break;
              
              // Skip lunch break
              if (timeSlot.start === "13:05") continue;
              
              // Find faculties for this subject
              const subjectFaculties = faculties.filter(faculty => 
                faculty.subjects.includes(subjectId)
              );
              
              if (subjectFaculties.length === 0) {
                console.log(`⚠️ No faculties available for subject ${subject.name || subjectId}`);
                break;
              }
              
              // Try each faculty
              for (const faculty of shuffleArray(subjectFaculties)) {
                // Skip if faculty is HOD and this is first lecture
                if (faculty.position === "HOD" && timeSlot.start === "09:15") continue;
                
                // Try to add lecture
                if (addLecture(day, timeSlot, classObj, subject, faculty)) {
                  lectureAdded = true;
                  console.log(`Added lecture for ${subject.name || subjectId} on ${day} at ${timeSlot.start}`);
                  break;
                }
              }
            }
          }
          
          // If still not added, try any day (might end up with multiple lectures on same day)
          if (!lectureAdded) {
            for (const day of shuffleArray(DAYS)) {
              if (lectureAdded) break;
              
              for (const timeSlot of shuffleArray(TIME_SLOTS)) {
                if (lectureAdded) break;
                if (timeSlot.start === "13:05") continue; // Skip lunch
                
                // Find faculties for this subject
                const subjectFaculties = faculties.filter(faculty => 
                  faculty.subjects.includes(subjectId)
                );
                
                // Try each faculty
                for (const faculty of shuffleArray(subjectFaculties)) {
                  if (faculty.position === "HOD" && timeSlot.start === "09:15") continue;
                  
                  if (addLecture(day, timeSlot, classObj, subject, faculty)) {
                    lectureAdded = true;
                    console.log(`Added lecture (fallback) for ${subject.name || subjectId} on ${day}`);
                    break;
                  }
                }
              }
            }
          }
          
          if (!lectureAdded) {
            console.log(`⚠️ Could not schedule lecture for ${subject.name || subjectId} in phase ${phase}`);
          }
        }
      });
    }
    
    // Check for subjects with insufficient lectures
    classes.forEach(classObj => {
      subjects.forEach(subject => {
        if (classObj.subjects.includes(subject.id) && subject.type !== "Optional") {
          const count = subjectLectureCount[classObj.id][subject.id];
          if (count < targetLecturesPerSubject) {
            console.log(`⚠️ Subject ${subject.name || subject.id} has only ${count}/${targetLecturesPerSubject} lectures for class ${classObj.name || classObj.id}`);
            
            // Last effort to add missing lectures
            const lecturesNeeded = targetLecturesPerSubject - count;
            console.log(`Attempting to add ${lecturesNeeded} more lectures for ${subject.name || subject.id}`);
            
            // Get all possible faculty for this subject
            const subjectFaculties = faculties.filter(faculty => 
              faculty.subjects.includes(subject.id)
            );
            
            if (subjectFaculties.length === 0) {
              console.log(`No faculties available for ${subject.name || subject.id}`);
              return;
            }
            
            // Try every possible slot to add the missing lectures
            let addedCount = 0;
            
            for (let attempt = 0; attempt < 3 && addedCount < lecturesNeeded; attempt++) {
              for (const day of shuffleArray(DAYS)) {
                if (addedCount >= lecturesNeeded) break;
                
                for (const timeSlot of shuffleArray(TIME_SLOTS)) {
                  if (addedCount >= lecturesNeeded) break;
                  if (timeSlot.start === "13:05") continue; // Skip lunch
                  
                  for (const faculty of shuffleArray(subjectFaculties)) {
                    if (addedCount >= lecturesNeeded) break;
                    
                    if (addLecture(day, timeSlot, classObj, subject, faculty)) {
                      addedCount++;
                      console.log(`✅ Added emergency lecture for ${subject.name || subject.id} on ${day} at ${timeSlot.start}`);
                      break;
                    }
                  }
                }
              }
            }
            
            // If we still couldn't add enough lectures, we may have an impossible constraint set
            if (addedCount < lecturesNeeded) {
              console.log(`❌ Could only add ${addedCount}/${lecturesNeeded} missing lectures for ${subject.name || subject.id}`);
            }
          }
        }
      });
    });
    
    // Log lecture schedule status
    classes.forEach(classObj => {
      console.log(`\nLecture schedule for class ${classObj.name || classObj.id}:`);
      subjects.forEach(subject => {
        if (classObj.subjects.includes(subject.id)) {
          const count = subjectLectureCount[classObj.id][subject.id];
          console.log(`- ${subject.name || subject.id}: ${count}/${targetLecturesPerSubject} lectures`);
          
          // Log distribution across days
          const dayDistribution: Record<string, number> = {};
          DAYS.forEach(day => {
            dayDistribution[day] = timetable.filter(entry => 
              entry.classId === classObj.id && 
              entry.subject === subject.id && 
              entry.day === day &&
              entry.batch === null
            ).length;
          });
          
          const distributionStr = DAYS.map(day => `${day.slice(0,3)}:${dayDistribution[day]}`).join(', ');
          console.log(`  Distribution: ${distributionStr}`);
        }
      });
    });
  };
  
  // Function to validate the generated timetable
  const validateTimetable = () => {
    const issues: string[] = [];
    const targetLecturesPerSubject = constraints.lecturesPerSubject || 3;
    
    // Check each subject has exactly 3 lectures per week
    classes.forEach(classObj => {
      subjects.forEach(subject => {
        if (classObj.subjects.includes(subject.id) && subject.type !== "Optional") {
          const count = subjectLectureCount[classObj.id][subject.id];
          if (count !== targetLecturesPerSubject) {
            issues.push(`Subject "${subject.name || subject.id}" has ${count} lectures for class ${classObj.name || classObj.id}, should have exactly ${targetLecturesPerSubject}`);
          }
        }
      });
    });
    
    // Check HODs don't have first lectures
    timetable.forEach(entry => {
      const faculty = faculties.find(f => f.id === entry.faculty);
      if (faculty?.position === "HOD" && entry.timeSlot.start === "09:15" && entry.batch === null) {
        issues.push(`HOD ${faculty.name || faculty.id} has first lecture on ${entry.day}`);
      }
    });
    
    // Check faculty has at most 1 lecture per day
    faculties.forEach(faculty => {
      DAYS.forEach(day => {
        const lectureCount = timetable.filter(entry => 
          entry.faculty === faculty.id && entry.day === day && entry.batch === null
        ).length;
        
        if (lectureCount > 1) {
          issues.push(`Faculty ${faculty.name || faculty.id} has ${lectureCount} lectures on ${day}, should have at most 1`);
        }
      });
    });
    
    // Check each batch has each lab subject once
    classes.forEach(classObj => {
      const labSubjects = subjects.filter(subject => 
        subject.isLab && subject.type !== "Optional" && classObj.subjects.includes(subject.id)
      );
      
      (classObj.batches || ['B1', 'B2', 'B3']).forEach(batch => {
        labSubjects.forEach(subject => {
          const count = batchLabCount[classObj.id][subject.id][batch] || 0;
          if (count !== 1) {
            issues.push(`Batch ${batch} of class ${classObj.name || classObj.id} has ${count} labs for ${subject.name || subject.id}, should have exactly 1`);
          }
        });
      });
    });
    
    return issues;
  };
  
  // Main generation algorithm
  const generateWithConstraints = () => {
    // Reset state
    timetable = [];
    
    // Reset counters
    classes.forEach(classObj => {
      subjects.forEach(subject => {
        subjectLectureCount[classObj.id][subject.id] = 0;
      });
      
      subjects.forEach(subject => {
        if (subject.isLab && subject.type !== "Optional" && classObj.subjects.includes(subject.id)) {
          (classObj.batches || ['B1', 'B2', 'B3']).forEach(batch => {
            batchLabCount[classObj.id][subject.id][batch] = 0;
          });
        }
      });
    });
    
    faculties.forEach(faculty => {
      DAYS.forEach(day => {
        facultyLecturesPerDay[faculty.id][day] = 0;
      });
    });
    
    // 1. Schedule lab sessions first (more constrained)
    scheduleLabSessions();
    
    // 2. Schedule lectures
    scheduleLectures();
    
    // 3. Validate the result
    const issues = validateTimetable();
    
    return {
      timetable,
      issues
    };
  };
  
  // Try multiple generations to find the best one
  const MAX_ATTEMPTS = constraints.numberOfAttempts || 10;
  let bestTimetable: any[] = [];
  let bestIssues: string[] = [];
  let lowestIssueCount = Infinity;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    console.log(`\nAttempt ${attempt + 1} of ${MAX_ATTEMPTS}...`);
    
    const result = generateWithConstraints();
    const issueCount = result.issues.length;
    
    console.log(`Generated timetable with ${issueCount} issues`);
    
    if (issueCount < lowestIssueCount) {
      lowestIssueCount = issueCount;
      bestTimetable = result.timetable;
      bestIssues = result.issues;
      
      console.log(`✅ New best timetable found with ${issueCount} issues`);
      
      if (issueCount === 0) {
        console.log("Perfect timetable found! Ending search.");
        break;
      }
    }
  }
  
  console.log(`\nBest timetable found with ${lowestIssueCount} issues:`);
  bestIssues.forEach(issue => console.log(`- ${issue}`));
  
  return bestTimetable;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestData = await req.json();
    const { faculties, subjects, classes, resources, constraints = {} } = requestData;
    
    // Validate input data
    if (!faculties || !Array.isArray(faculties) || 
        !subjects || !Array.isArray(subjects) || 
        !classes || !Array.isArray(classes)) {
      throw new Error("Invalid input data format. Expected arrays for faculties, subjects, and classes.");
    }
    
    console.log("Received data:", {
      facultiesCount: faculties.length,
      subjectsCount: subjects.length,
      classesCount: classes.length,
      resourcesCount: resources?.length || 0,
      constraints
    });
    
    // Generate timetable with timeout protection
    const timeoutMs = 25000; // 25 seconds
    let timetable;
    
    // Generate timetable with timeout protection
    const generateWithTimeout = async () => {
      return new Promise((resolve, reject) => {
        // Set timeout
        const timeoutId = setTimeout(() => {
          reject(new Error("Timetable generation timed out"));
        }, timeoutMs);
        
        try {
          // Generate timetable
          const result = generateTimetable(faculties, subjects, classes, resources, constraints);
          clearTimeout(timeoutId);
          resolve(result);
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });
    };
    
    try {
      timetable = await generateWithTimeout();
    } catch (timeoutError) {
      console.error("Generation timed out:", timeoutError);
      
      // If timeout occurred, generate a simpler timetable
      const emergencyConstraints = {
        ...constraints,
        skipValidation: true,
        emergency: true
      };
      
      timetable = generateTimetable(faculties, subjects, classes, resources, emergencyConstraints);
    }
    
    console.log(`Generated timetable with ${timetable.length} entries`);
    
    // Return the generated timetable
    return new Response(JSON.stringify({ timetable }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in generate-timetable function:", error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
