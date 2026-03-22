export type Batch = 'Trainee' | 'Assistant' | 'Junior';

export interface Prefect {
  id: string;
  name: string;
  prefectId: string;
  batch: Batch;
  createdAt: string;
}

export type DutyType = 'Attendance' | 'Morning Duty' | 'Evening Duty' | 'Sign Off Session' | 'Special Duty' | 'Phones Caught';

export interface DutyRecord {
  id: string;
  prefectId: string;
  dutyType: DutyType;
  points: number;
  date: string;
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

export const BATCH_COLORS: Record<Batch, { bg: string; text: string; border: string }> = {
  'Trainee': { bg: 'bg-white', text: 'text-foreground', border: 'border-gray-300' },
  'Assistant': { bg: 'bg-silver-light', text: 'text-foreground', border: 'border-silver' },
  'Junior': { bg: 'bg-maroon/10', text: 'text-maroon', border: 'border-maroon/30' },
};
