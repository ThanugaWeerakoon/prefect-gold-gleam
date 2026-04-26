import { Prefect, DutyRecord, AcademicYear, BatchName } from './types';

const API = '/api';

// ─── Auth Token Management ───
const TOKEN_KEY = 'acpg_auth_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ─── Helper ───
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${url}`, {
    headers,
    ...options,
  });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Auth ───
export async function login(
  username: string,
  password: string
): Promise<{ token: string; username: string }> {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Login failed');
  }

  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function logout() {
  try {
    await request('/logout', { method: 'POST' });
  } catch {
    // Ignore errors on logout
  }
  clearToken();
}

// ─── Academic Years ───
export async function getAcademicYears(): Promise<AcademicYear[]> {
  return request('/years');
}

export async function getCurrentYear(): Promise<AcademicYear> {
  return request('/years/current');
}

// Optional helper if you later use year-specific batch loading
export async function getBatchesByYear(yearId: number) {
  return request(`/batches/${yearId}`);
}

// ─── Prefects ───
interface RawPrefect {
  id: string;
  name: string;
  prefect_id: string;
  batch: BatchName;
  batch_id: number;
  rank: number;
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
    rank: raw.rank || 0,
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

export async function addPrefect(prefect: {
  id: string;
  name: string;
  prefectId: string;
  batch: BatchName;
  rank: number;
}) {
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

export async function addDutyRecord(record: {
  id: string;
  prefectId: string;
  dutyType: string;
  points: number;
  date: string;
}) {
  return request('/duties', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

export async function deleteDutyRecord(id: string) {
  return request(`/duties/${id}`, { method: 'DELETE' });
}

export async function updateDutyRecord(
  id: string,
  updates: { dutyType?: string; points?: number; date?: string }
) {
  return request(`/duties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function addBulkDutyRecords(
  prefectIds: string[],
  duties: { dutyType: string; points: number }[],
  date: string
) {
  return request<{
    success: boolean;
    prefectCount: number;
    dutyCount: number;
    totalRecords: number;
    message: string;
  }>('/duties/bulk', {
    method: 'POST',
    body: JSON.stringify({ prefectIds, duties, date }),
  });
}

// ─── Promotion (batch-by-batch) ───
export async function initPromotion(newYear: string) {
  return request<{ success: boolean; message: string; newYearId: number }>(
    '/promote/init',
    {
      method: 'POST',
      body: JSON.stringify({ newYear }),
    }
  );
}

export async function promoteBatch(
  sourceBatch: string,
  targetBatch: string,
  promoteCount: number
) {
  return request<{
    success: boolean;
    sourceBatch?: string;
    targetBatch?: string;
    promoted: number;
    deactivated: number;
    promotedIds?: string[];
    message: string;
  }>('/promote/batch', {
    method: 'POST',
    body: JSON.stringify({
      sourceBatch,
      targetBatch,
      promoteCount,
    }),
  });
}

export async function removeSeniorPrefects() {
  return request<{
    success: boolean;
    removed: number;
    message: string;
  }>('/promote/remove-seniors', {
    method: 'POST',
  });
}

export async function setCurrentYear(yearId: number) {
  return request<{
    success: boolean;
    message: string;
  }>('/years/set-current', {
    method: 'POST',
    body: JSON.stringify({ yearId }),
  });
}