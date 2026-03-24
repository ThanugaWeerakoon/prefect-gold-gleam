import { useEffect, useMemo, useState } from 'react';
import { getPrefects, getDutyRecords } from '@/lib/store';
import { Batch, Prefect, DutyRecord } from '@/lib/types';
import { BatchBadge } from '@/components/BatchBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { exportToPDF, exportToExcel } from '@/lib/export';
import { Trophy, FileDown, FileSpreadsheet } from 'lucide-react';

interface LeaderboardEntry {
  prefect: Prefect;
  totalPoints: number;
  dutyCount: number;
  avgPoints: number;
}

export default function Leaderboard() {
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [records, setRecords] = useState<DutyRecord[]>([]);
  const [batchFilter, setBatchFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      try {
        const [p, d] = await Promise.all([getPrefects(), getDutyRecords()]);
        setPrefects(p);
        setRecords(d);
      } catch (err) {
        console.error('Failed to load leaderboard data:', err);
      }
    }
    load();
  }, []);

  const entries: LeaderboardEntry[] = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    records.forEach(r => {
      const cur = map.get(r.prefectId) || { total: 0, count: 0 };
      cur.total += r.points;
      cur.count += 1;
      map.set(r.prefectId, cur);
    });

    return prefects
      .filter(p => batchFilter === 'all' || p.batch === batchFilter)
      .map(p => {
        const data = map.get(p.id) || { total: 0, count: 0 };
        return {
          prefect: p,
          totalPoints: data.total,
          dutyCount: data.count,
          avgPoints: data.count > 0 ? Math.round(data.total / data.count) : 0,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [prefects, records, batchFilter]);

  const medalColors = [
    'gold-gradient',
    'bg-silver',
    'bg-maroon/20',
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4" style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground mt-1">Rankings by total points</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              <SelectItem value="Trainee">Trainee Prefects</SelectItem>
              <SelectItem value="Assistant">Assistant Prefects</SelectItem>
              <SelectItem value="Junior">Junior Prefects</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="active:scale-[0.97]"
            disabled={entries.length === 0}
            onClick={() => {
              const data = entries.map((e, i) => ({
                rank: i + 1, name: e.prefect.name, prefectId: e.prefect.prefectId,
                batch: e.prefect.batch, totalPoints: e.totalPoints, dutyCount: e.dutyCount, avgPoints: e.avgPoints,
              }));
              exportToPDF(data, batchFilter);
            }}
          >
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="active:scale-[0.97]"
            disabled={entries.length === 0}
            onClick={() => {
              const data = entries.map((e, i) => ({
                rank: i + 1, name: e.prefect.name, prefectId: e.prefect.prefectId,
                batch: e.prefect.batch, totalPoints: e.totalPoints, dutyCount: e.dutyCount, avgPoints: e.avgPoints,
              }));
              exportToExcel(data, batchFilter);
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="card-elevated p-12 text-center text-muted-foreground" style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 100ms forwards', opacity: 0 }}>
          No prefects found. Add prefects and record duties to see rankings.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div
              key={entry.prefect.id}
              className={`card-elevated p-4 flex items-center gap-4 ${i < 3 ? 'ring-1 ring-gold/30' : ''}`}
              style={{ animation: `fade-up 0.5s cubic-bezier(0.16,1,0.3,1) ${80 + i * 60}ms forwards`, opacity: 0 }}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                i < 3 ? medalColors[i] : 'bg-secondary text-muted-foreground'
              } ${i === 0 ? 'text-foreground' : ''}`}>
                {i === 0 ? <Trophy className="h-5 w-5" /> : i + 1}
              </span>

              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${i < 3 ? 'text-lg' : ''}`}>{entry.prefect.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <BatchBadge batch={entry.prefect.batch} />
                  <span className="text-xs text-muted-foreground">{entry.prefect.prefectId}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className={`font-bold tabular-nums ${i < 3 ? 'text-xl gold-text' : 'text-lg'}`}>
                  {entry.totalPoints.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.dutyCount} duties · avg {entry.avgPoints}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
