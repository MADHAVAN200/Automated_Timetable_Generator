import { supabase } from "@/integrations/supabase/client";
import { AppData, Faculty, Subject, ClassBatch, Resource, TimetableEntry, TimeSlot, createTimeSlot } from '@/types';
import { Json } from "@/integrations/supabase/types";

// Legacy functions kept for backup
export const saveToLocalStorage = async <T>(key: string, data: T): Promise<void> => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage: ${error}`);
  }
};

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading from localStorage: ${error}`);
    return defaultValue;
  }
};

// Get all application data from Supabase
export const getAppData = async (): Promise<AppData> => {
  const [
    { data: facultiesData }, 
    { data: subjectsData }, 
    { data: classesData }, 
    { data: resourcesData },
    { data: timetableData }
  ] = await Promise.all([
    supabase.from('faculties').select('*'),
    supabase.from('subjects').select('*'),
    supabase.from('classes').select('*'),
    supabase.from('resources').select('*'),
    supabase.from('timetable_entries').select('*')
  ]);

  // Convert database data to application types
  const faculties: Faculty[] = (facultiesData || []).map(f => {
    // Process availability to ensure it's the correct type
    const availability: { [day: string]: TimeSlot[] } = {};
    if (f.availability && typeof f.availability === 'object') {
      // Convert the JSONB availability to the expected type structure
      Object.entries(f.availability as Record<string, any>).forEach(([day, slots]) => {
        if (Array.isArray(slots)) {
          availability[day] = slots.map(slot => ({
            start: slot.start || '',
            end: slot.end || ''
          }));
        }
      });
    }

    // Map DB position to our application position types
    let position: 'HOD' | 'Regular' = 'Regular';
    if (f.position === 'HOD') {
      position = 'HOD';
    }

    return {
      id: f.id,
      name: f.name,
      position: position,
      subjects: f.subjects || [],
      availability
    };
  });

  const subjects: Subject[] = (subjectsData || []).map(s => ({
    id: s.id,
    name: s.name,
    isLab: s.is_lab || false,
    facultyIds: s.faculty_ids || [],
    // Set a default 'Regular' type if not specified in the database
    type: 'Regular' 
  }));

  const classes: ClassBatch[] = (classesData || []).map(c => ({
    id: c.id,
    name: c.name,
    subjects: c.subjects || [],
    batches: (c.batches || ['B1', 'B2', 'B3']) as ['B1', 'B2', 'B3']
  }));

  const resources: Resource[] = (resourcesData || []).map(r => ({
    id: r.id,
    name: r.name,
    type: r.type as 'classroom' | 'lab',
    capacity: r.capacity
  }));

  const timetable: TimetableEntry[] = (timetableData || []).map(t => ({
    day: t.day,
    timeSlot: createTimeSlot(t.start_time, t.end_time),
    subject: t.subject_id,
    faculty: t.faculty_id,
    resource: t.resource_id,
    batch: t.batch as 'B1' | 'B2' | 'B3' | null,
    classId: t.class_id
  }));

  return {
    faculties,
    subjects,
    classes,
    resources,
    timetable
  };
};

// Save faculty
export const saveFaculty = async (faculty: Faculty): Promise<void> => {
  try {
    // Strictly ensure position is EXACTLY 'HOD' or 'Regular' as a string literal
    const position: 'HOD' | 'Regular' = faculty.position === 'HOD' ? 'HOD' : 'Regular';
  
    console.log("Saving faculty with position:", position);
    
    // Create a new object without type reference issues
    const dbFaculty = {
      id: faculty.id,
      name: faculty.name,
      position: position,
      subjects: faculty.subjects || [],
      availability: faculty.availability || {}
    };

    // Log the exact data being sent
    console.log("Data being sent to database:", JSON.stringify(dbFaculty));

    const { error } = await supabase
      .from('faculties')
      .upsert(dbFaculty);
  
    if (error) {
      console.error("Error in saveFaculty:", error);
      throw error;
    }
  } catch (error) {
    console.error("Exception in saveFaculty:", error);
    throw error;
  }
};

// Save subject - updated to not send the 'type' field to the database
export const saveSubject = async (subject: Subject): Promise<void> => {
  const { error } = await supabase
    .from('subjects')
    .upsert({
      id: subject.id,
      name: subject.name,
      is_lab: subject.isLab,
      faculty_ids: subject.facultyIds
      // Removed the type field as it doesn't exist in the database
    });
  
  if (error) throw error;
};

// Save class
export const saveClass = async (classBatch: ClassBatch): Promise<void> => {
  const { error } = await supabase
    .from('classes')
    .upsert({
      id: classBatch.id,
      name: classBatch.name,
      subjects: classBatch.subjects,
      batches: classBatch.batches
    });
  
  if (error) throw error;
};

// Save resource
export const saveResource = async (resource: Resource): Promise<void> => {
  const { error } = await supabase
    .from('resources')
    .upsert({
      id: resource.id,
      name: resource.name,
      type: resource.type,
      capacity: resource.capacity
    });
  
  if (error) throw error;
};

// Save timetable entry
export const saveTimetableEntry = async (entry: TimetableEntry): Promise<TimetableEntry> => {
  try {
    console.log("Saving timetable entry:", entry);
    
    // Ensure resource ID is not empty
    if (!entry.resource) {
      throw new Error("Resource ID cannot be empty");
    }
    
    // Type-safe batch handling - ensure batch is either null or one of the allowed values
    let typeSafeBatch: 'B1' | 'B2' | 'B3' | null = null;
    if (entry.batch) {
      if (entry.batch === 'B1' || entry.batch === 'B2' || entry.batch === 'B3') {
        typeSafeBatch = entry.batch;
      } else {
        console.warn(`Invalid batch value: ${entry.batch}, defaulting to null`);
      }
    }
    
    // Check if entry exists
    const { data: existingEntries, error: fetchError } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('day', entry.day)
      .eq('class_id', entry.classId)
      .eq('subject_id', entry.subject)
      .eq('start_time', entry.timeSlot.start)
      .eq('end_time', entry.timeSlot.end);
      
    if (fetchError) {
      console.error("Error checking for existing timetable entry:", fetchError);
      throw fetchError;
    }
    
    if (existingEntries && existingEntries.length > 0) {
      // Update existing entry
      const { data, error } = await supabase
        .from('timetable_entries')
        .update({
          faculty_id: entry.faculty,
          resource_id: entry.resource,
          batch: typeSafeBatch,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEntries[0].id)
        .select()
        .single();
        
      if (error) {
        console.error("Error updating timetable entry:", error);
        throw error;
      }
      
      // Convert the DB batch to the correct type
      let resultBatch: 'B1' | 'B2' | 'B3' | null = null;
      if (data.batch === 'B1' || data.batch === 'B2' || data.batch === 'B3') {
        resultBatch = data.batch as 'B1' | 'B2' | 'B3';
      }
      
      return {
        day: data.day,
        timeSlot: { start: data.start_time, end: data.end_time },
        subject: data.subject_id,
        faculty: data.faculty_id,
        resource: data.resource_id,
        batch: resultBatch,
        classId: data.class_id
      };
    } else {
      // Insert new entry
      const { data, error } = await supabase
        .from('timetable_entries')
        .insert({
          day: entry.day,
          start_time: entry.timeSlot.start,
          end_time: entry.timeSlot.end,
          subject_id: entry.subject,
          faculty_id: entry.faculty,
          resource_id: entry.resource,
          batch: typeSafeBatch,
          class_id: entry.classId
        })
        .select()
        .single();
        
      if (error) {
        console.error("Error inserting timetable entry:", error);
        throw error;
      }
      
      // Convert the DB batch to the correct type
      let resultBatch: 'B1' | 'B2' | 'B3' | null = null;
      if (data.batch === 'B1' || data.batch === 'B2' || data.batch === 'B3') {
        resultBatch = data.batch as 'B1' | 'B2' | 'B3';
      }
      
      return {
        day: data.day,
        timeSlot: { start: data.start_time, end: data.end_time },
        subject: data.subject_id,
        faculty: data.faculty_id,
        resource: data.resource_id,
        batch: resultBatch,
        classId: data.class_id
      };
    }
  } catch (error) {
    console.error("Error saving timetable entry:", error);
    throw error;
  }
};

// Delete functions
export const deleteFaculty = async (id: string): Promise<void> => {
  const { error } = await supabase.from('faculties').delete().eq('id', id);
  if (error) throw error;
};

export const deleteSubject = async (id: string): Promise<void> => {
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw error;
};

export const deleteClass = async (id: string): Promise<void> => {
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) throw error;
};

export const deleteResource = async (id: string): Promise<void> => {
  const { error } = await supabase.from('resources').delete().eq('id', id);
  if (error) throw error;
};

export const deleteTimetableEntry = async (id: string): Promise<void> => {
  const { error } = await supabase.from('timetable_entries').delete().eq('id', id);
  if (error) throw error;
};

// Clear all data (for admin use only)
export const clearAllData = async (): Promise<void> => {
  await Promise.all([
    supabase.from('timetable_entries').delete().neq('id', ''),
    supabase.from('resources').delete().neq('id', ''),
    supabase.from('classes').delete().neq('id', ''),
    supabase.from('subjects').delete().neq('id', ''),
    supabase.from('faculties').delete().neq('id', '')
  ]);
};
