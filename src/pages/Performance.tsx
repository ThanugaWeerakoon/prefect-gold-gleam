import { useEffect, useMemo, useState } from 'react';
import { getPrefects, getDutyRecords } from '@/lib/store';
import { Prefect, DutyRecord, DutyType, ALL_DUTIES } from '@/lib/types';
import { BatchBadge } from '@/components/BatchBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';

export default function Performance() {
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [records, setRecords] = useState<DutyRecord[]>([]);
  const [selectedPrefect, setSelectedPrefect] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [p, d] = await Promise.all([getPrefects(), getDutyRecords()]);
        setPrefects(p);
        setRecords(d);
      } catch (err) {
        console.error('Failed to load performance data:', err);
      }
    }
    load();
  }, []);

  const prefectRecords = useMemo(
    () => records.filter(r => r.prefectId === selectedPrefect).sort((a, b) => a.date.localeCompare(b.date)),
    [records, selectedPrefect]
  );

  const totalPoints = useMemo(() => prefectRecords.reduce((s, r) => s + r.points, 0), [prefectRecords]);
  const avgPoints = prefectRecords.length > 0 ? Math.round(totalPoints / prefectRecords.length) : 0;

  const chartData = useMemo(() => {
    const dateMap = new Map<string, number>();
    let cumulative = 0;
    prefectRecords.forEach(r => {
      cumulative += r.points;
      dateMap.set(r.date, cumulative);
    });
    return [...dateMap.entries()].map(([date, points]) => ({ date, points }));
  }, [prefectRecords]);

  const dutyBreakdown = useMemo(() => {
    const map: Record<string, { count: number; points: number }> = {};
    prefectRecords.forEach(r => {
      if (!map[r.dutyType]) map[r.dutyType] = { count: 0, points: 0 };
      map[r.dutyType].count++;
      map[r.dutyType].points += r.points;
    });
    return map;
  }, [prefectRecords]);

  const selectedObj = prefects.find(p => p.id === selectedPrefect);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <h1 className="text-3xl font-display font-bold tracking-tight">Performance</h1>
        <p className="text-muted-foreground mt-1">Individual prefect analytics</p>
      </div>

      <div className="space-y-2" style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 100ms forwards', opacity: 0 }}>
        <Label>Select Prefect</Label>
        <Select value={selectedPrefect} onValueChange={setSelectedPrefect}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a prefect" />
          </SelectTrigger>
          <SelectContent>
            {prefects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name} ({p.prefectId})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedObj && (
        <>
          {/* Stats */}
          <div
            className="grid grid-cols-3 gap-4"
            style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 200ms forwards', opacity: 0 }}
          >
            <div className="card-elevated p-4 text-center">
              <p className="text-2xl font-bold gold-text tabular-nums">{totalPoints.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <p className="text-2xl font-bold tabular-nums">{prefectRecords.length}</p>
              <p className="text-xs text-muted-foreground">Total Duties</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <p className="text-2xl font-bold tabular-nums">{avgPoints}</p>
              <p className="text-xs text-muted-foreground">Avg Points</p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div
              className="card-elevated p-6"
              style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 300ms forwards', opacity: 0 }}
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Points Over Time
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 15% 88%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="points" stroke="hsl(43 75% 52%)" strokeWidth={2.5} dot={{ fill: 'hsl(0 100% 25%)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Duty Breakdown */}
          <div
            className="card-elevated p-6"
            style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 400ms forwards', opacity: 0 }}
          >
            <h3 className="font-semibold mb-4">Duty Breakdown</h3>
            <div className="space-y-2">
              {ALL_DUTIES.map(duty => {
                const data = dutyBreakdown[duty];
                if (!data) return null;
                return (
                  <div key={duty} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 text-sm">
                    <span className="font-medium">{duty}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{data.count}×</span>
                      <span className="font-bold text-gold-dark tabular-nums">{data.points} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full History */}
          <div
            className="card-elevated p-6"
            style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 500ms forwards', opacity: 0 }}
          >
            <h3 className="font-semibold mb-4">Full History</h3>
            {prefectRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No records</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {[...prefectRecords].reverse().map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 px-3 rounded bg-secondary/30 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground tabular-nums text-xs">{r.date}</span>
                      <span>{r.dutyType}</span>
                    </div>
                    <span className="font-semibold text-gold-dark tabular-nums">+{r.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
