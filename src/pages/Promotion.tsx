import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPrefects, getCurrentYear, getAcademicYears, bulkPromote } from '@/lib/store';
import { Prefect, AcademicYear } from '@/lib/types';
import { BatchBadge } from '@/components/BatchBadge';
import { toast } from 'sonner';
import { ArrowUpCircle, GraduationCap, AlertTriangle } from 'lucide-react';

export default function Promotion() {
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [newYear, setNewYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const load = async () => {
    try {
      const [p, y, allYears] = await Promise.all([
        getPrefects(),
        getCurrentYear(),
        getAcademicYears(),
      ]);
      setPrefects(p);
      setCurrentYear(y);
      setYears(allYears);
    } catch (err) {
      console.error('Failed to load promotion data:', err);
    }
  };

  useEffect(() => { load(); }, []);

  const trainees = prefects.filter(p => p.batch === 'Trainee');
  const assistants = prefects.filter(p => p.batch === 'Assistant');
  const juniors = prefects.filter(p => p.batch === 'Junior');

  const handlePromote = async () => {
    if (!newYear.trim()) {
      toast.error('Enter the new academic year (e.g. 2026/2027)');
      return;
    }
    if (!/^\d{4}\/\d{4}$/.test(newYear.trim())) {
      toast.error('Year must be in format YYYY/YYYY (e.g. 2026/2027)');
      return;
    }

    setLoading(true);
    try {
      const result = await bulkPromote(newYear.trim());
      toast.success(result.message);
      setShowConfirm(false);
      setNewYear('');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Promotion failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <h1 className="text-3xl font-display font-bold tracking-tight">Promotion</h1>
        <p className="text-muted-foreground mt-1">
          Bulk promote all prefects to the next batch
        </p>
      </div>

      {/* Current Year Info */}
      <div
        className="card-elevated p-6"
        style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 100ms forwards', opacity: 0 }}
      >
        <h3 className="font-semibold mb-4">Current Academic Year</h3>
        <p className="text-2xl font-bold text-gold-dark">
          {currentYear?.year || 'Not set'}
        </p>
      </div>

      {/* Current Breakdown */}
      <div
        className="card-elevated p-6 space-y-4"
        style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 200ms forwards', opacity: 0 }}
      >
        <h3 className="font-semibold">Current Batches</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <BatchBadge batch="Trainee" />
              <span className="text-sm text-muted-foreground">→ will become <strong>Assistant</strong></span>
            </div>
            <span className="font-bold tabular-nums">{trainees.length} prefects</span>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <BatchBadge batch="Assistant" />
              <span className="text-sm text-muted-foreground">→ will become <strong>Junior</strong></span>
            </div>
            <span className="font-bold tabular-nums">{assistants.length} prefects</span>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <BatchBadge batch="Junior" />
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                → will <strong>graduate</strong> <GraduationCap className="h-4 w-4" />
              </span>
            </div>
            <span className="font-bold tabular-nums">{juniors.length} prefects</span>
          </div>
        </div>
      </div>

      {/* Promotion Action */}
      <div
        className="card-elevated p-6 space-y-4"
        style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 300ms forwards', opacity: 0 }}
      >
        <h3 className="font-semibold flex items-center gap-2">
          <ArrowUpCircle className="h-5 w-5" />
          Promote All Prefects
        </h3>

        {!showConfirm ? (
          <Button
            variant="gold"
            className="w-full active:scale-[0.97]"
            onClick={() => setShowConfirm(true)}
            disabled={prefects.length === 0}
          >
            Start Promotion Process
          </Button>
        ) : (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">This action cannot be undone!</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li>• {juniors.length} Junior prefect(s) will be <strong>graduated</strong></li>
                  <li>• {assistants.length} Assistant prefect(s) → Junior</li>
                  <li>• {trainees.length} Trainee prefect(s) → Assistant</li>
                  <li>• Points will reset (new year, fresh leaderboard)</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <Label>New Academic Year</Label>
              <Input
                value={newYear}
                onChange={e => setNewYear(e.target.value)}
                placeholder="e.g. 2026/2027"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 active:scale-[0.97]"
                onClick={() => { setShowConfirm(false); setNewYear(''); }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                className="flex-1 active:scale-[0.97]"
                onClick={handlePromote}
                disabled={loading || !newYear.trim()}
              >
                {loading ? 'Promoting...' : 'Confirm Promotion'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Past Years */}
      {years.length > 1 && (
        <div
          className="card-elevated p-6"
          style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 400ms forwards', opacity: 0 }}
        >
          <h3 className="font-semibold mb-3">Academic Year History</h3>
          <div className="space-y-1.5">
            {years.map(y => (
              <div key={y.id} className="flex items-center justify-between py-2 px-3 rounded bg-secondary/30 text-sm">
                <span className="font-medium">{y.year}</span>
                {y.is_current && (
                  <span className="text-xs font-bold text-gold-dark">Current</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
