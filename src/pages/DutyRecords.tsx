import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPrefects, getDutyRecords, addDutyRecord, deleteDutyRecord, addBulkDutyRecords } from '@/lib/store';
import { Prefect, DutyRecord, DutyType, DUTY_POINTS, DAILY_DUTIES, OCCASIONAL_DUTIES, TIER_ORDER } from '@/lib/types';
import { BatchBadge } from '@/components/BatchBadge';
import { toast } from 'sonner';
import { ClipboardList, Plus, Trash2, ChevronDown, Calendar, Users, User } from 'lucide-react';

interface DayGroup {
  date: string;
  displayDate: string;
  records: DutyRecord[];
  totalPoints: number;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function DutyRecords() {
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [records, setRecords] = useState<DutyRecord[]>([]);
  
  // Individual Mode State
  const [selectedPrefect, setSelectedPrefect] = useState('');
  
  // Batch Mode State
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedPrefectIds, setSelectedPrefectIds] = useState<string[]>([]);
  
  // Shared State
  const [selectedDuties, setSelectedDuties] = useState<DutyType[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

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

  // Group records by day for individual history
  const dayGroups: DayGroup[] = useMemo(() => {
    const map = new Map<string, DutyRecord[]>();
    prefectRecords.forEach(r => {
      const key = r.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateStr, recs]) => ({
        date: dateStr,
        displayDate: formatDate(dateStr),
        records: recs,
        totalPoints: recs.reduce((s, r) => s + r.points, 0),
      }));
  }, [prefectRecords]);

  const batchPrefects = useMemo(() => {
    return prefects
      .filter(p => p.batch === selectedBatch && p.isActive)
      .sort((a, b) => (a.rank || 0) - (b.rank || 0));
  }, [prefects, selectedBatch]);

  const toggleDay = (dateKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

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

  const togglePrefectSelection = (id: string) => {
    setSelectedPrefectIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleAllPrefects = () => {
    if (selectedPrefectIds.length === batchPrefects.length) {
      setSelectedPrefectIds([]);
    } else {
      setSelectedPrefectIds(batchPrefects.map(p => p.id));
    }
  };

  const totalPreview = selectedDuties.reduce((s, d) => s + DUTY_POINTS[d], 0);

  const handleAddIndividual = async () => {
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

  const handleAddBulk = async () => {
    if (selectedPrefectIds.length === 0 || selectedDuties.length === 0) {
      toast.error('Select at least one prefect and one duty');
      return;
    }

    setLoading(true);
    try {
      const dutiesPayload = selectedDuties.map(d => ({ dutyType: d, points: DUTY_POINTS[d] }));
      const result = await addBulkDutyRecords(selectedPrefectIds, dutiesPayload, date);
      
      toast.success(result.message);
      setSelectedDuties([]);
      setSelectedPrefectIds([]); // Clear selection after successful bulk add
      await reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to bulk add duties');
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

      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6" style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 100ms forwards', opacity: 0 }}>
          <TabsTrigger value="individual" onClick={() => setSelectedDuties([])}>
            <User className="w-4 h-4 mr-2" />
            Individual
          </TabsTrigger>
          <TabsTrigger value="batch" onClick={() => setSelectedDuties([])}>
            <Users className="w-4 h-4 mr-2" />
            Multiple Prefects
          </TabsTrigger>
        </TabsList>

        {/* ── Individual Mode ─────────────────────── */}
        <TabsContent value="individual">
          <div
            className="card-elevated p-6 space-y-5"
            style={{ animation: 'fade-up 0.3s ease-out forwards' }}
          >
            <div className="space-y-2">
              <Label>Select Prefect</Label>
              <Select value={selectedPrefect} onValueChange={v => { setSelectedPrefect(v); setSelectedDuties([]); setExpandedDays(new Set()); }}>
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
                <div className="pt-1 flex items-center gap-2">
                  <BatchBadge batch={selectedPrefectObj.batch} />
                  <span className="text-xs text-muted-foreground">Rank {selectedPrefectObj.rank || '-'}</span>
                </div>
              )}
            </div>

            {selectedPrefect && (
              <DutySelectionForm 
                selectedDuties={selectedDuties}
                toggleDuty={toggleDuty}
                selectAllDaily={selectAllDaily}
                date={date}
                setDate={setDate}
                onSubmit={handleAddIndividual}
                loading={loading}
                totalPreview={totalPreview}
              />
            )}
          </div>

          {/* Duties History for Individual */}
          {selectedPrefect && (
            <div className="card-elevated p-6 mt-8" style={{ animation: 'fade-up 0.4s ease-out forwards' }}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                History ({prefectRecords.length} records)
              </h3>

              {dayGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No records yet</p>
              ) : (
                <div className="space-y-2">
                  {dayGroups.map((group) => {
                    const isExpanded = expandedDays.has(group.date);
                    return (
                      <div key={group.date} className="rounded-lg border border-border overflow-hidden">
                        <button
                          onClick={() => toggleDay(group.date)}
                          className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors duration-200 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-sm font-medium">{group.displayDate}</p>
                              <p className="text-xs text-muted-foreground">
                                {group.records.length} {group.records.length === 1 ? 'duty' : 'duties'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gold-dark tabular-nums">
                              +{group.totalPoints} pts
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border bg-secondary/20">
                            {group.records.map(r => (
                              <div
                                key={r.id}
                                className="flex items-center justify-between py-2.5 px-4 text-sm border-b border-border/50 last:border-b-0"
                              >
                                <span className="font-medium">{r.dutyType}</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-gold-dark tabular-nums">+{r.points}</span>
                                  <button
                                    onClick={() => handleDelete(r.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Multiple Prefects Mode ───────────────── */}
        <TabsContent value="batch">
          <div
            className="card-elevated p-6 space-y-5"
            style={{ animation: 'fade-up 0.3s ease-out forwards' }}
          >
            <div className="space-y-2">
              <Label>Select Tier</Label>
              <Select value={selectedBatch} onValueChange={v => { setSelectedBatch(v); setSelectedPrefectIds([]); setSelectedDuties([]); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tier" />
                </SelectTrigger>
                <SelectContent>
                  {TIER_ORDER.map(tier => (
                    <SelectItem key={tier} value={tier}>
                      {tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBatch && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex items-center justify-between pt-2">
                  <h3 className="font-semibold text-sm">Select Prefects</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={toggleAllPrefects} className="text-xs h-8">
                    {selectedPrefectIds.length === batchPrefects.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                
                {batchPrefects.length > 0 ? (
                  <div className="border border-border rounded-lg max-h-60 overflow-y-auto bg-background/50 divide-y divide-border">
                    {batchPrefects.map((p, i) => (
                      <label 
                        key={p.id} 
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                          selectedPrefectIds.includes(p.id) ? 'bg-gold/5' : 'hover:bg-secondary/40'
                        }`}
                      >
                        <Checkbox 
                          checked={selectedPrefectIds.includes(p.id)} 
                          onCheckedChange={() => togglePrefectSelection(p.id)} 
                        />
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold shrink-0">
                            {p.rank || i + 1}
                          </span>
                          <span className="font-medium text-sm truncate">{p.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">{p.prefectId}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic p-4 border border-dashed rounded-lg text-center">
                    No active prefects found in this tier.
                  </p>
                )}

                {selectedPrefectIds.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <DutySelectionForm 
                      selectedDuties={selectedDuties}
                      toggleDuty={toggleDuty}
                      selectAllDaily={selectAllDaily}
                      date={date}
                      setDate={setDate}
                      onSubmit={handleAddBulk}
                      loading={loading}
                      totalPreview={totalPreview}
                      isBulk={true}
                      selectedCount={selectedPrefectIds.length}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Reusable Duty Selection Form Component
function DutySelectionForm({ 
  selectedDuties, toggleDuty, selectAllDaily, date, setDate, onSubmit, loading, totalPreview, isBulk = false, selectedCount = 1 
}: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pt-1">
        <h3 className="font-semibold">Select Duties</h3>
        <Button type="button" variant="outline" size="sm" onClick={selectAllDaily} className="text-xs active:scale-[0.97]">
          {DAILY_DUTIES.every(d => selectedDuties.includes(d)) ? 'Deselect All Daily' : 'Select All Daily'}
        </Button>
      </div>

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

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            onClick={onSubmit}
            variant="gold"
            className="w-full sm:w-auto active:scale-[0.97]"
            disabled={selectedDuties.length === 0 || loading || (isBulk && selectedCount === 0)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {loading ? 'Adding...' : (
              <>
                Add {selectedDuties.length > 0 ? `${selectedDuties.length} ${selectedDuties.length === 1 ? 'Duty' : 'Duties'}` : 'Duties'}
                {totalPreview > 0 && ` (${totalPreview} pts)`}
                {isBulk && selectedCount > 1 && ` × ${selectedCount}`}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
