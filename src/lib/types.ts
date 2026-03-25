export type BatchName = 'Trainee' | 'Assistant' | 'Junior' | 'Temp Assistant' | 'Senior';

// Keep backward-compatible alias
export type Batch = BatchName;

export interface AcademicYear {
  id: number;
  year: string;        // e.g. "2025/2026"
  is_current: boolean;
}

export interface Prefect {
  id: string;
  name: string;
  prefectId: string;       // display id e.g. "TP-001"  (mapped from prefect_id)
  batch: BatchName;        // resolved batch name
  batchId: number;
  isActive: boolean;
  academicYear: string;
  yearId: number;
  createdAt: string;
}

export type DutyType = 'Attendance' | 'Morning Duty' | 'Evening Duty' | 'Sign Off Session' | 'Special Duty' | 'Phones Caught';

export interface DutyRecord {
  id: string;
  prefectId: string;
  dutyType: DutyType;
  points: number;
  date: string;
  yearId: number;
  createdAt: string;
}

export const DUTY_POINTS: Record<DutyType, number> = {
  'Attendance': 25,
  'Morning Duty': 25,
  'Evening Duty': 25,
  'Sign Off Session': 25,
  'Special Duty': 100,
  'Phones Caught': 100,
};

export const DAILY_DUTIES: DutyType[] = ['Attendance', 'Morning Duty', 'Evening Duty', 'Sign Off Session'];
export const OCCASIONAL_DUTIES: DutyType[] = ['Special Duty', 'Phones Caught'];
export const ALL_DUTIES: DutyType[] = [...DAILY_DUTIES, ...OCCASIONAL_DUTIES];

export const BATCH_COLORS: Record<BatchName, { bg: string; text: string; border: string }> = {
  'Trainee': { bg: 'bg-white', text: 'text-foreground', border: 'border-gray-300' },
  'Assistant': { bg: 'bg-silver-light', text: 'text-foreground', border: 'border-silver' },
  'Junior': { bg: 'bg-maroon/10', text: 'text-maroon', border: 'border-maroon/30' },
  'Temp Assistant': { bg: 'bg-maroon/10', text: 'text-maroon', border: 'border-maroon/30' },
  'Senior': { bg: 'bg-maroon/10', text: 'text-maroon', border: 'border-maroon/30' },
};
