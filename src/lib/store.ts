import { Prefect, DutyRecord, AcademicYear, BatchName } from './types';

const API = '/api';

// ─── Helper ───
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Academic Years ───
export async function getAcademicYears(): Promise<AcademicYear[]> {
  return request('/years');
}

export async function getCurrentYear(): Promise<AcademicYear> {
  return request('/years/current');
}

// ─── Prefects ───
interface RawPrefect {
  id: string;
  name: string;
  prefect_id: string;
  batch: BatchName;
  batch_id: number;
  is_active: boolean;
  academic_year: string;
  year_id: number;
  created_at: string;
}

function mapPrefect(raw: RawPrefect): Prefect {
  return {
    id: raw.id,
    name: raw.name,
    prefectId: raw.prefect_id,
    batch: raw.batch,
    batchId: raw.batch_id,
    isActive: raw.is_active,
    academicYear: raw.academic_year,
    yearId: raw.year_id,
    createdAt: raw.created_at,
  };
}

export async function getPrefects(): Promise<Prefect[]> {
  const raw = await request<RawPrefect[]>('/prefects');
  return raw.map(mapPrefect);
}

export async function addPrefect(prefect: { id: string; name: string; prefectId: string; batch: BatchName }) {
  return request('/prefects', {
    method: 'POST',
    body: JSON.stringify(prefect),
  });
}

export async function deletePrefect(id: string) {
  return request(`/prefects/${id}`, { method: 'DELETE' });
}

// ─── Duty Records ───
interface RawDuty {
  id: string;
  prefect_id: string;
  duty_type: string;
  points: number;
  date: string;
  year_id: number;
  created_at: string;
}

function mapDuty(raw: RawDuty): DutyRecord {
  return {
    id: raw.id,
    prefectId: raw.prefect_id,
    dutyType: raw.duty_type as DutyRecord['dutyType'],
    points: raw.points,
    date: raw.date,
    yearId: raw.year_id,
    createdAt: raw.created_at,
  };
}

export async function getDutyRecords(): Promise<DutyRecord[]> {
  const raw = await request<RawDuty[]>('/duties');
  return raw.map(mapDuty);
}

export async function addDutyRecord(record: { id: string; prefectId: string; dutyType: string; points: number; date: string }) {
  return request('/duties', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

export async function deleteDutyRecord(id: string) {
  return request(`/duties/${id}`, { method: 'DELETE' });
}

export async function updateDutyRecord(id: string, updates: { dutyType?: string; points?: number; date?: string }) {
  return request(`/duties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ─── Promotion ───
export async function bulkPromote(newYear: string) {
  return request<{ success: boolean; message: string; newYearId: number }>('/promote', {
    method: 'POST',
    body: JSON.stringify({ newYear }),
  });
}
