import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { getPrefects, getDutyRecords, addDutyRecord, deleteDutyRecord } from '@/lib/store';
import { Prefect, DutyRecord, DutyType, DUTY_POINTS, DAILY_DUTIES, OCCASIONAL_DUTIES } from '@/lib/types';
import { BatchBadge } from '@/components/BatchBadge';
import { toast } from 'sonner';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';

export default function DutyRecords() {
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [records, setRecords] = useState<DutyRecord[]>([]);
  const [selectedPrefect, setSelectedPrefect] = useState('');
  const [selectedDuties, setSelectedDuties] = useState<DutyType[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    try {
      const [p, d] = await Promise.all([getPrefects(), getDutyRecords()]);
      setPrefects(p);
      setRecords(d);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => { reload(); }, []);

  const prefectRecords = useMemo(
    () => records.filter(r => r.prefectId === selectedPrefect).sort((a, b) => b.date.localeCompare(a.date)),
    [records, selectedPrefect]
  );

  const toggleDuty = (duty: DutyType) => {
    setSelectedDuties(prev =>
      prev.includes(duty) ? prev.filter(d => d !== duty) : [...prev, duty]
    );
  };

  const selectAllDaily = () => {
    const allSelected = DAILY_DUTIES.every(d => selectedDuties.includes(d));
    if (allSelected) {
      setSelectedDuties(prev => prev.filter(d => !DAILY_DUTIES.includes(d)));
    } else {
      setSelectedDuties(prev => [...new Set([...prev, ...DAILY_DUTIES])]);
    }
  };

  const totalPreview = selectedDuties.reduce((s, d) => s + DUTY_POINTS[d], 0);

  const handleAdd = async () => {
    if (!selectedPrefect || selectedDuties.length === 0) {
      toast.error('Select a prefect and at least one duty');
      return;
    }

    setLoading(true);
    try {
      for (const duty of selectedDuties) {
        await addDutyRecord({
          id: crypto.randomUUID(),
          prefectId: selectedPrefect,
          dutyType: duty,
          points: DUTY_POINTS[duty],
          date,
        });
      }

      toast.success(`${selectedDuties.length} duties recorded — ${totalPreview} pts total`);
      setSelectedDuties([]);
      await reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add duty records');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDutyRecord(id);
      toast.info('Record deleted');
      await reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete record');
    }
  };

  const selectedPrefectObj = prefects.find(p => p.id === selectedPrefect);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <h1 className="text-3xl font-display font-bold tracking-tight">Duty Records</h1>
        <p className="text-muted-foreground mt-1">Record and manage prefect duties</p>
      </div>

      <div
        className="card-elevated p-6 space-y-5"
        style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 100ms forwards', opacity: 0 }}
      >
        <div className="space-y-2">
          <Label>Select Prefect</Label>
          <Select value={selectedPrefect} onValueChange={v => { setSelectedPrefect(v); setSelectedDuties([]); }}>
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
            <div className="flex items-center justify-between pt-3">
              <h3 className="font-semibold">Select Duties</h3>
              <Button type="button" variant="outline" size="sm" onClick={selectAllDaily} className="text-xs active:scale-[0.97]">
                {DAILY_DUTIES.every(d => selectedDuties.includes(d)) ? 'Deselect All Daily' : 'Select All Daily'}
              </Button>
            </div>

            {/* Daily Duties */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Daily Duties</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DAILY_DUTIES.map(duty => (
                  <label
                    key={duty}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedDuties.includes(duty)
                        ? 'border-gold bg-gold/5 shadow-sm'
                        : 'border-border bg-secondary/30 hover:bg-secondary/60'
                    }`}
                  >
                    <Checkbox
                      checked={selectedDuties.includes(duty)}
                      onCheckedChange={() => toggleDuty(duty)}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{duty}</span>
                    </div>
                    <span className="text-xs font-bold text-gold-dark tabular-nums">{DUTY_POINTS[duty]} pts</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Occasional Duties */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Occasional</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OCCASIONAL_DUTIES.map(duty => (
                  <label
                    key={duty}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedDuties.includes(duty)
                        ? 'border-gold bg-gold/5 shadow-sm'
                        : 'border-border bg-secondary/30 hover:bg-secondary/60'
                    }`}
                  >
                    <Checkbox
                      checked={selectedDuties.includes(duty)}
                      onCheckedChange={() => toggleDuty(duty)}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{duty}</span>
                    </div>
                    <span className="text-xs font-bold text-gold-dark tabular-nums">{DUTY_POINTS[duty]} pts</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date + Submit */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAdd}
                  variant="gold"
                  className="w-full sm:w-auto active:scale-[0.97]"
                  disabled={selectedDuties.length === 0 || loading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {loading ? 'Adding...' : (
                    <>
                      Add {selectedDuties.length > 0 ? `${selectedDuties.length} ${selectedDuties.length === 1 ? 'Duty' : 'Duties'}` : 'Duties'}
                      {totalPreview > 0 && ` (${totalPreview} pts)`}
                    </>
                  )}
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
