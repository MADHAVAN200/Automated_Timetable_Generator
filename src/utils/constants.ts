
// Constants for the timetable generator

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
];

// Standard time slots as per your requirements
export const TIME_SLOTS = [
  { start: '09:15', end: '10:15' },
  { start: '10:15', end: '11:15' },
  { start: '11:15', end: '12:15' },
  { start: '12:15', end: '13:05' }, // 50 min slot before lunch
  // Lunch Break: 13:05 - 13:35
  { start: '13:35', end: '14:35' },
  { start: '14:35', end: '15:35' }
];

// Lab slots (2 hours each)
export const LAB_SLOTS = [
  { start: '09:15', end: '11:15' }, // Morning lab
  { start: '13:35', end: '15:35' }  // Afternoon lab
];

export const LUNCH_BREAK = { start: '13:05', end: '13:35' };

export const POSITIONS = ['HOD', 'Regular'];

export const SUBJECT_TYPES = ['Regular', 'Optional'];

// Local storage keys
export const STORAGE_KEYS = {
  FACULTIES: 'timetable_faculties',
  SUBJECTS: 'timetable_subjects',
  CLASSES: 'timetable_classes',
  RESOURCES: 'timetable_resources',
  TIMETABLE: 'timetable_generated'
};
