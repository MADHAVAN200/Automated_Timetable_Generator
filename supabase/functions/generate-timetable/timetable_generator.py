import random
from typing import Dict, List, Tuple, Union, Optional
from datetime import datetime, time, timedelta
import json

# Define types
class TimeSlot:
    def __init__(self, start: str, end: str):
        self.start = start
        self.end = end
    
    def __str__(self):
        return f"{self.start}-{self.end}"
    
    def __repr__(self):
        return self.__str__()

class Faculty:
    def __init__(self, id: str, name: str, position: str, subjects: List[str], availability: Dict[str, List[TimeSlot]]):
        self.id = id
        self.name = name
        self.position = position  # HOD, Senior, Junior, Guest
        self.subjects = subjects
        self.availability = availability
        
    def is_available(self, day: str, time_slot: TimeSlot) -> bool:
        if day not in self.availability:
            return False
        
        for available_slot in self.availability[day]:
            if available_slot.start <= time_slot.start and available_slot.end >= time_slot.end:
                return True
        return False
    
    def __str__(self):
        return f"Faculty(id={self.id}, name={self.name}, position={self.position})"

class Subject:
    def __init__(self, id: str, name: str, is_lab: bool, faculty_ids: List[str]):
        self.id = id
        self.name = name
        self.is_lab = is_lab
        self.faculty_ids = faculty_ids
    
    def __str__(self):
        return f"Subject(id={self.id}, name={self.name}, is_lab={self.is_lab})"

class ClassBatch:
    def __init__(self, id: str, name: str, subjects: List[str], batches: List[str] = None):
        self.id = id
        self.name = name
        self.subjects = subjects
        self.batches = batches or ["B1", "B2", "B3"]
    
    def __str__(self):
        return f"Class(id={self.id}, name={self.name})"

class Resource:
    def __init__(self, id: str, name: str, type_: str, capacity: int):
        self.id = id
        self.name = name
        self.type = type_  # classroom or lab
        self.capacity = capacity
    
    def __str__(self):
        return f"Resource(id={self.id}, name={self.name}, type={self.type})"

class TimetableEntry:
    def __init__(self, day: str, time_slot: TimeSlot, subject_id: str, faculty_id: str, 
                 resource_id: str, class_id: str, batch: Optional[str] = None):
        self.day = day
        self.time_slot = time_slot
        self.subject_id = subject_id
        self.faculty_id = faculty_id
        self.resource_id = resource_id
        self.class_id = class_id
        self.batch = batch  # B1, B2, B3 or None for full class
    
    def __str__(self):
        batch_str = f", batch={self.batch}" if self.batch else ""
        return f"TimetableEntry(day={self.day}, time={self.time_slot}, subject={self.subject_id}, faculty={self.faculty_id}{batch_str})"

# Constants
DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

# Regular time slots for lectures (1 hour each)
TIME_SLOTS = [
    TimeSlot("09:15", "10:15"),
    TimeSlot("10:15", "11:15"),
    TimeSlot("11:15", "12:15"),
    TimeSlot("12:15", "13:05"),
    # Lunch Break: 13:05 - 13:35
    TimeSlot("13:35", "14:35"),
    TimeSlot("14:35", "15:35")
]

# Lab slots (2 hours each)
LAB_SLOTS = [
    TimeSlot("09:15", "11:15"),  # Morning lab
    TimeSlot("13:35", "15:35")   # Afternoon lab
]

LUNCH_BREAK = TimeSlot("13:05", "13:35")

def parse_time(time_str: str) -> time:
    """Convert string time format to datetime.time object"""
    hour, minute = map(int, time_str.split(':'))
    return time(hour=hour, minute=minute)

def is_earlier_time(time1: str, time2: str) -> bool:
    """Check if time1 is earlier than time2"""
    t1 = parse_time(time1)
    t2 = parse_time(time2)
    return t1 < t2

def is_time_overlap(slot1: TimeSlot, slot2: TimeSlot) -> bool:
    """Check if two time slots overlap"""
    return (
        (is_earlier_time(slot1.start, slot2.end) and is_earlier_time(slot2.start, slot1.end)) or
        slot1.start == slot2.start or 
        slot1.end == slot2.end
    )

class TimetableGenerator:
    def __init__(self, faculties: List[Faculty], subjects: List[Subject], 
                 classes: List[ClassBatch], resources: List[Resource]):
        self.faculties = faculties
        self.subjects = subjects
        self.classes = classes
        self.resources = resources
        self.timetable: List[TimetableEntry] = []
        
        # Initialize counters for constraint tracking
        self.subject_lecture_counts: Dict[str, Dict[str, int]] = {}
        self.batch_lab_counts: Dict[str, Dict[str, Dict[str, int]]] = {}
        
        # Init subject counts for each class
        for class_obj in self.classes:
            self.subject_lecture_counts[class_obj.id] = {subject_id: 0 for subject_id in class_obj.subjects}
            
            # Initialize lab counts for each batch
            self.batch_lab_counts[class_obj.id] = {}
            for subject_id in class_obj.subjects:
                subject = self.get_subject(subject_id)
                if subject and subject.is_lab:
                    self.batch_lab_counts[class_obj.id][subject_id] = {batch: 0 for batch in class_obj.batches}
    
    def get_subject(self, subject_id: str) -> Optional[Subject]:
        """Get subject by ID"""
        for subject in self.subjects:
            if subject.id == subject_id:
                return subject
        return None
    
    def get_faculty(self, faculty_id: str) -> Optional[Faculty]:
        """Get faculty by ID"""
        for faculty in self.faculties:
            if faculty.id == faculty_id:
                return faculty
        return None
    
    def get_resource(self, resource_id: str) -> Optional[Resource]:
        """Get resource by ID"""
        for resource in self.resources:
            if resource.id == resource_id:
                return resource
        return None
    
    def is_faculty_available(self, faculty_id: str, day: str, time_slot: TimeSlot) -> bool:
        """Check if faculty is available at the given day and time"""
        faculty = self.get_faculty(faculty_id)
        if not faculty:
            return False
        
        return faculty.is_available(day, time_slot)
    
    def is_resource_available(self, resource_id: str, day: str, time_slot: TimeSlot) -> bool:
        """Check if resource is available at the given day and time"""
        # Check if resource is already booked at this time
        for entry in self.timetable:
            if (entry.resource_id == resource_id and entry.day == day and 
                is_time_overlap(entry.time_slot, time_slot)):
                return False
        return True
    
    def is_faculty_booked(self, faculty_id: str, day: str, time_slot: TimeSlot) -> bool:
        """Check if faculty is already booked at this time"""
        for entry in self.timetable:
            if (entry.faculty_id == faculty_id and entry.day == day and 
                is_time_overlap(entry.time_slot, time_slot)):
                return True
        return False
    
    def is_class_available(self, class_id: str, day: str, time_slot: TimeSlot, batch: Optional[str] = None) -> bool:
        """Check if class (or specific batch) is available at the given day and time"""
        for entry in self.timetable:
            if entry.class_id == class_id and entry.day == day:
                # If checking full class availability (no batch specified)
                if batch is None:
                    # Class is busy if there's any entry for the whole class or overlapping batch times
                    if (entry.batch is None or is_time_overlap(entry.time_slot, time_slot)):
                        return False
                # If checking specific batch
                elif batch == entry.batch and is_time_overlap(entry.time_slot, time_slot):
                    return False
                # If class has a full-class activity, batch is also busy
                elif entry.batch is None and is_time_overlap(entry.time_slot, time_slot):
                    return False
        return True
    
    def get_available_faculty_for_subject(self, subject_id: str, day: str, time_slot: TimeSlot) -> Optional[str]:
        """Get available faculty for the subject at the given time"""
        subject = self.get_subject(subject_id)
        if not subject:
            return None
        
        # Check if the time slot is the first of the day
        is_first_slot = time_slot.start == TIME_SLOTS[0].start
        
        # Shuffle faculty_ids to randomize selection when multiple are available
        faculty_ids = subject.faculty_ids.copy()
        random.shuffle(faculty_ids)
        
        for faculty_id in faculty_ids:
            faculty = self.get_faculty(faculty_id)
            if not faculty:
                continue
                
            # Skip HODs for first lecture
            if is_first_slot and faculty.position == "HOD":
                continue
                
            if (self.is_faculty_available(faculty_id, day, time_slot) and 
                not self.is_faculty_booked(faculty_id, day, time_slot)):
                return faculty_id
                
        return None
    
    def get_available_resource(self, is_lab: bool, day: str, time_slot: TimeSlot) -> Optional[str]:
        """Get available resource for the given time"""
        resource_type = "lab" if is_lab else "classroom"
        
        # Shuffle resources to randomize selection
        resources = [r for r in self.resources if r.type == resource_type]
        random.shuffle(resources)
        
        for resource in resources:
            if self.is_resource_available(resource.id, day, time_slot):
                return resource.id
        
        return None
    
    def can_add_lecture(self, class_id: str, subject_id: str) -> bool:
        """Check if more lectures can be added for this subject"""
        max_lectures = 2  # Max 2 lectures per subject per week
        
        return self.subject_lecture_counts[class_id][subject_id] < max_lectures
    
    def get_lab_subjects_for_class(self, class_id: str) -> List[str]:
        """Get all lab subjects for a class"""
        class_obj = next((c for c in self.classes if c.id == class_id), None)
        if not class_obj:
            return []
            
        lab_subjects = []
        for subject_id in class_obj.subjects:
            subject = self.get_subject(subject_id)
            if subject and subject.is_lab:
                lab_subjects.append(subject_id)
                
        return lab_subjects
    
    def count_lectures_on_day(self, class_id: str, day: str) -> int:
        """Count number of lectures scheduled for a class on a specific day"""
        return sum(1 for entry in self.timetable 
                if entry.class_id == class_id and entry.day == day and entry.batch is None)
    
    def add_lecture(self, day: str, time_slot: TimeSlot, class_id: str, subject_id: str) -> bool:
        """Add a regular lecture to the timetable"""
        subject = self.get_subject(subject_id)
        if not subject:
            return False
            
        # Check if more lectures can be added for this subject
        if not self.can_add_lecture(class_id, subject_id):
            return False
            
        # Get available faculty
        faculty_id = self.get_available_faculty_for_subject(subject_id, day, time_slot)
        if not faculty_id:
            return False
            
        # Get available classroom
        resource_id = self.get_available_resource(subject.is_lab, day, time_slot)
        if not resource_id:
            return False
            
        # Check if class is available at this time
        if not self.is_class_available(class_id, day, time_slot):
            return False
            
        # Create timetable entry
        entry = TimetableEntry(
            day=day,
            time_slot=time_slot,
            subject_id=subject_id,
            faculty_id=faculty_id,
            resource_id=resource_id,
            class_id=class_id
        )
        
        # Add to timetable and update counts
        self.timetable.append(entry)
        self.subject_lecture_counts[class_id][subject_id] += 1
        
        return True
    
    def add_lab_session(self, day: str, lab_slot: TimeSlot, class_id: str, subject_id: str, batch: str) -> bool:
        """Add a lab session for a specific batch to the timetable"""
        subject = self.get_subject(subject_id)
        if not subject or not subject.is_lab:
            return False
            
        # Check if class/batch is available
        if not self.is_class_available(class_id, day, lab_slot, batch):
            return False
            
        # Get available faculty
        faculty_id = self.get_available_faculty_for_subject(subject_id, day, lab_slot)
        if not faculty_id:
            return False
            
        # Get available lab
        resource_id = self.get_available_resource(True, day, lab_slot)
        if not resource_id:
            return False
            
        # Create timetable entry
        entry = TimetableEntry(
            day=day,
            time_slot=lab_slot,
            subject_id=subject_id,
            faculty_id=faculty_id,
            resource_id=resource_id,
            class_id=class_id,
            batch=batch
        )
        
        # Add to timetable and update counts
        self.timetable.append(entry)
        self.batch_lab_counts[class_id][subject_id][batch] += 1
        
        return True
    
    def schedule_labs(self) -> None:
        """Schedule all lab sessions for all classes"""
        # First, schedule lab sessions which are more constrained
        for class_obj in self.classes:
            lab_subjects = self.get_lab_subjects_for_class(class_obj.id)
            
            if not lab_subjects:
                continue
                
            # For each lab subject
            for subject_id in lab_subjects:
                # For each batch
                for batch in class_obj.batches:
                    lab_scheduled = False
                    
                    # Try each day and slot
                    for day in DAYS_OF_WEEK:
                        for lab_slot in LAB_SLOTS:
                            if self.add_lab_session(day, lab_slot, class_obj.id, subject_id, batch):
                                lab_scheduled = True
                                break
                        
                        if lab_scheduled:
                            break
    
    def schedule_lectures(self) -> None:
        """Schedule regular lectures for all classes"""
        for class_obj in self.classes:
            for subject_id in class_obj.subjects:
                subject = self.get_subject(subject_id)
                if not subject or subject.is_lab:
                    continue
                    
                # Try to schedule up to max lectures per subject
                lectures_added = 0
                while lectures_added < 2:  # Max 2 lectures per subject per week
                    lecture_added = False
                    
                    # Try each day and slot
                    for day in DAYS_OF_WEEK:
                        # Prioritize days with fewer lectures
                        if self.count_lectures_on_day(class_obj.id, day) >= 4:
                            continue
                            
                        for time_slot in TIME_SLOTS:
                            # Skip lunch break
                            if time_slot.start == LUNCH_BREAK.start:
                                continue
                                
                            if self.add_lecture(day, time_slot, class_obj.id, subject_id):
                                lecture_added = True
                                lectures_added += 1
                                break
                                
                        if lecture_added or lectures_added >= 2:
                            break
                            
                    if not lecture_added:
                        break  # Could not add more lectures for this subject
    
    def fill_minimum_lectures(self) -> None:
        """Ensure each day has minimum 4 lectures if possible"""
        for class_obj in self.classes:
            for day in DAYS_OF_WEEK:
                lecture_count = self.count_lectures_on_day(class_obj.id, day)
                
                if lecture_count >= 4:
                    continue  # Already has minimum lectures
                    
                # Try to add more lectures to reach minimum
                while lecture_count < 4:
                    lecture_added = False
                    
                    # Try each subject that has lectures remaining
                    for subject_id in class_obj.subjects:
                        if self.can_add_lecture(class_obj.id, subject_id):
                            subject = self.get_subject(subject_id)
                            if subject and not subject.is_lab:
                                # Try each time slot
                                for time_slot in TIME_SLOTS:
                                    # Skip lunch break
                                    if time_slot.start == LUNCH_BREAK.start:
                                        continue
                                        
                                    if self.add_lecture(day, time_slot, class_obj.id, subject_id):
                                        lecture_added = True
                                        lecture_count += 1
                                        break
                                        
                        if lecture_added:
                            break
                            
                    if not lecture_added:
                        break  # Could not add more lectures
    
    def validate_timetable(self) -> Dict[str, List[str]]:
        """Validate the generated timetable against all constraints"""
        issues = {
            "hod_first_lecture": [],
            "subject_lecture_limit": [],
            "batch_lab_attendance": [],
            "minimum_lectures": [],
            "lab_timing": []
        }
        
        # Check HOD first lecture constraint
        for entry in self.timetable:
            faculty = self.get_faculty(entry.faculty_id)
            if not faculty:
                continue
                
            if (faculty.position == "HOD" and entry.time_slot.start == TIME_SLOTS[0].start):
                issues["hod_first_lecture"].append(
                    f"HOD {faculty.name} has first lecture on {entry.day}"
                )
        
        # Check subject lecture limit
        for class_id, subjects in self.subject_lecture_counts.items():
            class_obj = next((c for c in self.classes if c.id == class_id), None)
            class_name = class_obj.name if class_obj else class_id
            
            for subject_id, count in subjects.items():
                subject = self.get_subject(subject_id)
                subject_name = subject.name if subject else subject_id
                
                if count > 2:
                    issues["subject_lecture_limit"].append(
                        f"Subject {subject_name} has {count} lectures for class {class_name}"
                    )
        
        # Check each batch attends every lab subject once
        for class_id, subjects in self.batch_lab_counts.items():
            class_obj = next((c for c in self.classes if c.id == class_id), None)
            class_name = class_obj.name if class_obj else class_id
            
            for subject_id, batches in subjects.items():
                subject = self.get_subject(subject_id)
                subject_name = subject.name if subject else subject_id
                
                for batch, count in batches.items():
                    if count != 1:
                        issues["batch_lab_attendance"].append(
                            f"Batch {batch} of class {class_name} has {count} labs for {subject_name}"
                        )
        
        # Check minimum lectures per day
        for class_obj in self.classes:
            for day in DAYS_OF_WEEK:
                lecture_count = self.count_lectures_on_day(class_obj.id, day)
                
                if lecture_count < 4:
                    issues["minimum_lectures"].append(
                        f"Class {class_obj.name} has only {lecture_count} lectures on {day}"
                    )
        
        # Check lab timing (must be at start or end of day)
        for entry in self.timetable:
            if entry.batch is not None:  # It's a lab session
                if (entry.time_slot.start != LAB_SLOTS[0].start and 
                    entry.time_slot.start != LAB_SLOTS[1].start):
                    issues["lab_timing"].append(
                        f"Lab for {entry.class_id} on {entry.day} is not at start or end of day"
                    )
        
        return issues
    
    def generate(self) -> List[TimetableEntry]:
        """Generate the complete timetable"""
        # Reset the timetable and counters
        self.timetable = []
        
        for class_id in self.subject_lecture_counts:
            for subject_id in self.subject_lecture_counts[class_id]:
                self.subject_lecture_counts[class_id][subject_id] = 0
        
        for class_id in self.batch_lab_counts:
            for subject_id in self.batch_lab_counts[class_id]:
                for batch in self.batch_lab_counts[class_id][subject_id]:
                    self.batch_lab_counts[class_id][subject_id][batch] = 0
        
        # First schedule labs which are more constrained
        self.schedule_labs()
        
        # Then schedule regular lectures
        self.schedule_lectures()
        
        # Make sure minimum lecture requirement is met
        self.fill_minimum_lectures()
        
        return self.timetable

    def print_timetable(self) -> None:
        """Print the generated timetable in a readable format"""
        # Organize by day and class
        by_day_class = {}
        
        for day in DAYS_OF_WEEK:
            by_day_class[day] = {}
            for class_obj in self.classes:
                by_day_class[day][class_obj.id] = {
                    "lectures": [],
                    "labs": []
                }
        
        # Organize entries
        for entry in self.timetable:
            class_obj = next((c for c in self.classes if c.id == entry.class_id), None)
            subject = self.get_subject(entry.subject_id)
            faculty = self.get_faculty(entry.faculty_id)
            resource = self.get_resource(entry.resource_id)
            
            class_name = class_obj.name if class_obj else entry.class_id
            subject_name = subject.name if subject else entry.subject_id
            faculty_name = faculty.name if faculty else entry.faculty_id
            resource_name = resource.name if resource else entry.resource_id
            
            info = {
                "time": str(entry.time_slot),
                "subject": subject_name,
                "faculty": faculty_name,
                "resource": resource_name,
                "batch": entry.batch
            }
            
            if entry.batch is None:
                by_day_class[entry.day][entry.class_id]["lectures"].append(info)
            else:
                by_day_class[entry.day][entry.class_id]["labs"].append(info)
        
        # Print timetable
        for day in DAYS_OF_WEEK:
            print(f"\n===== {day} =====")
            
            for class_id, entries in by_day_class[day].items():
                class_obj = next((c for c in self.classes if c.id == class_id), None)
                class_name = class_obj.name if class_obj else class_id
                
                print(f"\n--- {class_name} ---")
                
                # Sort by time
                entries["lectures"].sort(key=lambda x: x["time"])
                entries["labs"].sort(key=lambda x: x["time"])
                
                # Print lectures
                if entries["lectures"]:
                    print("Regular Lectures:")
                    for lec in entries["lectures"]:
                        print(f"  {lec['time']} - {lec['subject']} by {lec['faculty']} in {lec['resource']}")
                
                # Print labs
                if entries["labs"]:
                    print("Lab Sessions:")
                    for lab in entries["labs"]:
                        print(f"  {lab['time']} - {lab['subject']} (Batch {lab['batch']}) by {lab['faculty']} in {lab['resource']}")
    
    def export_json(self, filename: str) -> None:
        """Export the timetable to a JSON file"""
        entries = []
        
        for entry in self.timetable:
            entries.append({
                "day": entry.day,
                "start_time": entry.time_slot.start,
                "end_time": entry.time_slot.end,
                "subject_id": entry.subject_id,
                "faculty_id": entry.faculty_id,
                "resource_id": entry.resource_id,
                "class_id": entry.class_id,
                "batch": entry.batch
            })
        
        with open(filename, 'w') as f:
            json.dump(entries, f, indent=2)
        
        print(f"Timetable exported to {filename}")


# Sample test data
def create_test_data():
    # Create faculties
    faculties = [
        Faculty(
            id="f1",
            name="Dr. Smith", 
            position="HOD",
            subjects=["s1", "s2"],
            availability={
                "Monday": [TimeSlot("09:15", "15:35")],
                "Tuesday": [TimeSlot("09:15", "15:35")],
                "Wednesday": [TimeSlot("09:15", "15:35")],
                "Thursday": [TimeSlot("09:15", "15:35")],
                "Friday": [TimeSlot("09:15", "15:35")]
            }
        ),
        Faculty(
            id="f2",
            name="Prof. Johnson", 
            position="Senior",
            subjects=["s3", "s4"],
            availability={
                "Monday": [TimeSlot("09:15", "15:35")],
                "Tuesday": [TimeSlot("09:15", "15:35")],
                "Wednesday": [TimeSlot("09:15", "15:35")],
                "Thursday": [TimeSlot("09:15", "15:35")]
            }
        ),
        Faculty(
            id="f3",
            name="Dr. Williams", 
            position="Junior",
            subjects=["s2", "s5"],
            availability={
                "Monday": [TimeSlot("09:15", "15:35")],
                "Tuesday": [TimeSlot("09:15", "15:35")],
                "Wednesday": [TimeSlot("09:15", "15:35")],
                "Friday": [TimeSlot("09:15", "15:35")]
            }
        ),
        Faculty(
            id="f4",
            name="Prof. Brown", 
            position="Junior",
            subjects=["s3", "s4"],
            availability={
                "Monday": [TimeSlot("09:15", "15:35")],
                "Wednesday": [TimeSlot("10:15", "15:35")],
                "Thursday": [TimeSlot("09:15", "15:35")],
                "Friday": [TimeSlot("09:15", "15:35")]
            }
        ),
        Faculty(
            id="f5",
            name="Ms. Jones", 
            position="Guest",
            subjects=["s1", "s5"],
            availability={
                "Tuesday": [TimeSlot("09:15", "15:35")],
                "Thursday": [TimeSlot("09:15", "15:35")],
                "Friday": [TimeSlot("09:15", "15:35")]
            }
        )
    ]
    
    # Create subjects
    subjects = [
        Subject(id="s1", name="Artificial Intelligence", is_lab=False, faculty_ids=["f1", "f5"]),
        Subject(id="s2", name="Data Mining", is_lab=False, faculty_ids=["f1", "f3"]),
        Subject(id="s3", name="Computer Networks", is_lab=True, faculty_ids=["f2", "f4"]),
        Subject(id="s4", name="Database Systems", is_lab=True, faculty_ids=["f2", "f4"]),
        Subject(id="s5", name="Machine Learning", is_lab=False, faculty_ids=["f3", "f5"])
    ]
    
    # Create classes
    classes = [
        ClassBatch(id="c1", name="CS-A", subjects=["s1", "s2", "s3", "s4"]),
        ClassBatch(id="c2", name="IT-B", subjects=["s2", "s3", "s4", "s5"])
    ]
    
    # Create resources
    resources = [
        Resource(id="r1", name="Classroom 101", type_="classroom", capacity=60),
        Resource(id="r2", name="Classroom 102", type_="classroom", capacity=60),
        Resource(id="r3", name="Lab 201", type_="lab", capacity=30),
        Resource(id="r4", name="Lab 202", type_="lab", capacity=30)
    ]
    
    return faculties, subjects, classes, resources

def main():
    # Create test data
    faculties, subjects, classes, resources = create_test_data()
    
    # Initialize timetable generator
    generator = TimetableGenerator(faculties, subjects, classes, resources)
    
    # Generate timetable
    timetable = generator.generate()
    
    # Print timetable
    generator.print_timetable()
    
    # Validate timetable
    issues = generator.validate_timetable()
    
    # Print validation results
    print("\n===== Timetable Validation =====")
    if all(len(issue_list) == 0 for issue_list in issues.values()):
        print("All constraints satisfied!")
    else:
        for issue_type, issue_list in issues.items():
            if issue_list:
                print(f"\n{issue_type.replace('_', ' ').title()}:")
                for issue in issue_list:
                    print(f"  - {issue}")
    
    # Export timetable to JSON
    generator.export_json("timetable.json")

if __name__ == "__main__":
    
    # Read input from stdin
    input_data = json.loads(input())
    
    # Extract data
    faculties_data = input_data['faculties']
    subjects_data = input_data['subjects']
    classes_data = input_data['classes']
    resources_data = input_data['resources']
    
    # Convert data to objects
    faculties = [Faculty(**f) for f in faculties_data]
    subjects = [Subject(**s) for s in subjects_data]
    classes = [ClassBatch(**c) for c in classes_data]
    resources = [Resource(**r) for r in resources_data]
    
    # Generate timetable
    generator = TimetableGenerator(faculties, subjects, classes, resources)
    timetable = generator.generate()
    
    # Convert timetable to JSON
    timetable_json = json.dumps([{"day": entry.day, 
                                  "time_slot": {"start": entry.time_slot.start, "end": entry.time_slot.end},
                                  "subject": entry.subject_id,
