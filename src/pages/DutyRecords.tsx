import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { getPrefects, getDutyRecords, addDutyRecord, deleteDutyRecord } from '@/lib/store';
import { Prefect, DutyRecord, DutyType, ALL_DUTIES, DUTY_POINTS, DAILY_DUTIES, OCCASIONAL_DUTIES } from '@/lib/types';
import { BatchBadge } from '@/components/BatchBadge';
import { toast } from 'sonner';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';

export default function DutyRecords() {
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [records, setRecords] = useState<DutyRecord[]>([]);
  const [selectedPrefect, setSelectedPrefect] = useState('');
  const [selectedDuty, setSelectedDuty] = useState<DutyType | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const reload = () => {
    setPrefects(getPrefects());
    setRecords(getDutyRecords());
  };

  useEffect(reload, []);

  const prefectRecords = useMemo(
    () => records.filter(r => r.prefectId === selectedPrefect).sort((a, b) => b.date.localeCompare(a.date)),
    [records, selectedPrefect]
  );

  const handleAdd = () => {
    if (!selectedPrefect || !selectedDuty) {
      toast.error('Select a prefect and duty type');
      return;
    }

    addDutyRecord({
      id: crypto.randomUUID(),
      prefectId: selectedPrefect,
      dutyType: selectedDuty,
      points: DUTY_POINTS[selectedDuty],
      date,
      createdAt: new Date().toISOString(),
    });

    toast.success(`${selectedDuty} recorded — ${DUTY_POINTS[selectedDuty]} pts`);
    setSelectedDuty('');
    reload();
  };

  const handleDelete = (id: string) => {
    deleteDutyRecord(id);
    toast.info('Record deleted');
    reload();
  };

  const selectedPrefectObj = prefects.find(p => p.id === selectedPrefect);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <h1 className="text-3xl font-display font-bold tracking-tight">Duty Records</h1>
        <p className="text-muted-foreground mt-1">Record and manage prefect duties</p>
      </div>

      {/* Select Prefect */}
      <div
        className="card-elevated p-6 space-y-5"
        style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 100ms forwards', opacity: 0 }}
      >
        <div className="space-y-2">
          <Label>Select Prefect</Label>
          <Select value={selectedPrefect} onValueChange={setSelectedPrefect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a prefect" />
            </SelectTrigger>
            <SelectContent>
              {prefects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.prefectId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPrefectObj && (
            <div className="pt-1">
              <BatchBadge batch={selectedPrefectObj.batch} />
            </div>
          )}
        </div>

        {selectedPrefect && (
          <div className="space-y-4 pt-2 border-t border-border">
            <h3 className="font-semibold pt-3">Add Duty</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Duty Type</Label>
                <Select value={selectedDuty} onValueChange={v => setSelectedDuty(v as DutyType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem disabled value="daily-header">— Daily Duties —</SelectItem>
                    {DAILY_DUTIES.map(d => (
                      <SelectItem key={d} value={d}>{d} ({DUTY_POINTS[d]} pts)</SelectItem>
                    ))}
                    <SelectItem disabled value="occ-header">— Occasional —</SelectItem>
                    {OCCASIONAL_DUTIES.map(d => (
                      <SelectItem key={d} value={d}>{d} ({DUTY_POINTS[d]} pts)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAdd} variant="gold" className="w-full active:scale-[0.97]">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Records list */}
      {selectedPrefect && (
        <div
          className="card-elevated p-6"
          style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 200ms forwards', opacity: 0 }}
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            History ({prefectRecords.length} records)
          </h3>
          {prefectRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No records yet</p>
          ) : (
            <div className="space-y-2">
              {prefectRecords.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground tabular-nums">{r.date}</span>
                    <span className="font-medium">{r.dutyType}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gold-dark tabular-nums">+{r.points}</span>
                    <button onClick={() => handleDelete(r.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
