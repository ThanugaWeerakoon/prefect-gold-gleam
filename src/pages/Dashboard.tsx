import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Award, Trophy, ArrowRight } from 'lucide-react';
import { getPrefects, getDutyRecords } from '@/lib/store';
import { Prefect, DutyRecord } from '@/lib/types';
import { BatchBadge } from '@/components/BatchBadge';

export default function Dashboard() {
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [duties, setDuties] = useState<DutyRecord[]>([]);

  useEffect(() => {
    setPrefects(getPrefects());
    setDuties(getDutyRecords());
  }, []);

  const totalPoints = useMemo(() => duties.reduce((s, d) => s + d.points, 0), [duties]);

  const topPrefects = useMemo(() => {
    const map = new Map<string, number>();
    duties.forEach(d => map.set(d.prefectId, (map.get(d.prefectId) || 0) + d.points));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, points]) => ({ prefect: prefects.find(p => p.id === id), points }))
      .filter(x => x.prefect);
  }, [prefects, duties]);

  const batchCounts = useMemo(() => ({
    Trainee: prefects.filter(p => p.batch === 'Trainee').length,
    Assistant: prefects.filter(p => p.batch === 'Assistant').length,
    Junior: prefects.filter(p => p.batch === 'Junior').length,
  }), [prefects]);

  const stats = [
    { label: 'Total Prefects', value: prefects.length, icon: Users, color: 'text-primary' },
    { label: 'Points Awarded', value: totalPoints.toLocaleString(), icon: Award, color: 'text-gold-dark' },
    { label: 'Duty Records', value: duties.length, icon: Trophy, color: 'text-maroon-light' },
  ];

  const batchStats = [
    { label: 'Trainee Prefects', value: batchCounts.Trainee, accent: 'border-l-gray-400' },
    { label: 'Assistant Prefects', value: batchCounts.Assistant, accent: 'border-l-silver' },
    { label: 'Junior Prefects', value: batchCounts.Junior, accent: 'border-l-maroon' },
  ];

  return (
    <div className="space-y-8">
      <div style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Ananda College Prefects' Guild — Points Overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="card-elevated p-6 flex items-center gap-4"
            style={{ animation: `fade-up 0.6s cubic-bezier(0.16,1,0.3,1) ${100 + i * 80}ms forwards`, opacity: 0 }}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-secondary ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/add-prefect"
          className="card-elevated p-5 flex items-center justify-between group"
          style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 400ms forwards', opacity: 0 }}
        >
          <div>
            <p className="font-semibold">Add New Prefect</p>
            <p className="text-sm text-muted-foreground">Register a new prefect to the system</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-gold transition-colors" />
        </Link>
        <Link
          to="/duties"
          className="card-elevated p-5 flex items-center justify-between group"
          style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 480ms forwards', opacity: 0 }}
        >
          <div>
            <p className="font-semibold">Record Duties</p>
            <p className="text-sm text-muted-foreground">Log duty completions and assign points</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-gold transition-colors" />
        </Link>
      </div>

      {/* Top Prefects */}
      <div
        className="card-elevated p-6"
        style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 560ms forwards', opacity: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-semibold">Top Performers</h2>
          <Link to="/leaderboard" className="text-sm text-gold-dark hover:text-gold font-medium">
            View All →
          </Link>
        </div>
        {topPrefects.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">No data yet. Start by adding prefects and recording duties.</p>
        ) : (
          <div className="space-y-3">
            {topPrefects.map(({ prefect, points }, i) => (
              <div key={prefect!.id} className="flex items-center gap-4 py-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  i < 3 ? 'gold-gradient text-foreground' : 'bg-secondary text-muted-foreground'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{prefect!.name}</p>
                  <BatchBadge batch={prefect!.batch} />
                </div>
                <p className="font-bold tabular-nums text-gold-dark">{points.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
