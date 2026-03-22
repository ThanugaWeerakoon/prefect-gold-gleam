import { Prefect, DutyRecord } from './types';

const PREFECTS_KEY = 'acpg_prefects';
const DUTIES_KEY = 'acpg_duties';

export function getPrefects(): Prefect[] {
  const data = localStorage.getItem(PREFECTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function savePrefects(prefects: Prefect[]) {
  localStorage.setItem(PREFECTS_KEY, JSON.stringify(prefects));
}

export function addPrefect(prefect: Prefect) {
  const all = getPrefects();
  all.push(prefect);
  savePrefects(all);
}

export function getDutyRecords(): DutyRecord[] {
  const data = localStorage.getItem(DUTIES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveDutyRecords(records: DutyRecord[]) {
  localStorage.setItem(DUTIES_KEY, JSON.stringify(records));
}

export function addDutyRecord(record: DutyRecord) {
  const all = getDutyRecords();
  all.push(record);
  saveDutyRecords(all);
}

export function updateDutyRecord(id: string, updates: Partial<DutyRecord>) {
  const all = getDutyRecords();
  const idx = all.findIndex(r => r.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates };
    saveDutyRecords(all);
  }
}

export function deleteDutyRecord(id: string) {
  const all = getDutyRecords().filter(r => r.id !== id);
  saveDutyRecords(all);
}
