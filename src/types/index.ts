
// Types for the timetable generator application

export type Faculty = {
  id: string;
  name: string;
  position: 'HOD' | 'Regular';  // Only two roles as per requirements
  subjects: string[];
  availability: {
    [day: string]: TimeSlot[];
  };
};

export type Subject = {
  id: string;
  name: string;
  isLab: boolean;
  facultyIds: string[];
  type: 'Regular' | 'Optional';  // Subject type as per requirements
};

export type ClassBatch = {
  id: string;
  name: string; // e.g., "CS-A", "IT-B"
  subjects: string[];
  batches: ['B1', 'B2', 'B3'];
};

export type Resource = {
  id: string;
  name: string;
  type: 'classroom' | 'lab';
  capacity: number;
};

export type TimeSlot = {
  start: string; // in HH:MM format
  end: string;   // in HH:MM format
};

// Helper to ensure TimeSlot is complete
export const createTimeSlot = (start: string, end: string): TimeSlot => ({
  start,
  end
});

export type TimetableEntry = {
  day: string;
  timeSlot: TimeSlot;
  subject: string;
  faculty: string;
  resource: string;
  batch?: 'B1' | 'B2' | 'B3' | null; // Only for lab sessions
  classId: string;
};

// Store for application data
export type AppData = {
  faculties: Faculty[];
  subjects: Subject[];
  classes: ClassBatch[];
  resources: Resource[];
  timetable: TimetableEntry[];
};
