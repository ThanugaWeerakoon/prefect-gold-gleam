import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getPrefects,
  promoteBatch,
  removeSeniorPrefects,
} from '@/lib/store';
import { Prefect, BatchName, TIER_ORDER } from '@/lib/types';
import { BatchBadge } from '@/components/BatchBadge';
import { toast } from 'sonner';
import {
  ArrowUpCircle,
  Crown,
  X,
  UserX,
  Users,
  Trash2,
  ShieldAlert,
} from 'lucide-react';

/** Promotion transitions — source → target */
const PROMOTIONS: { source: BatchName; target: BatchName }[] = TIER_ORDER
  .slice(0, -1)
  .map((source, i) => ({ source, target: TIER_ORDER[i + 1] }));

interface ActionModal {
  source: BatchName;
  target: BatchName;
  list: Prefect[];
}

export default function Promotion() {
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState<ActionModal | null>(null);
  const [promoteCount, setPromoteCount] = useState('');

  // Confirmation modal for removing seniors
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const load = async () => {
    try {
      const p = await getPrefects();
      setPrefects(p);
    } catch (err) {
      console.error('Failed to load promotion data:', err);
      toast.error('Failed to load promotion data');
    }
  };

  useEffect(() => {
    load();
  }, []);

  /** Group active prefects by tier */
  const tierMap = useMemo(() => {
    const map: Record<string, Prefect[]> = {};
    TIER_ORDER.forEach(tier => {
      map[tier] = prefects
        .filter(p => p.batch === tier && p.isActive !== false)
        .sort((a, b) => (a.rank || 0) - (b.rank || 0));
    });
    return map;
  }, [prefects]);

  const seniors = tierMap['Senior Prefect'] || [];

  /* ─── Modal Handlers ──────────────────────── */

  const openModal = (source: BatchName, target: BatchName, list: Prefect[]) => {
    setModal({ source, target, list });
    setPromoteCount('');
  };

  const closeModal = () => {
    setModal(null);
    setPromoteCount('');
  };

  const handlePromote = async () => {
    if (!modal) return;

    const count = parseInt(promoteCount, 10);

    if (Number.isNaN(count) || count < 0) {
      toast.error('Enter a valid number');
      return;
    }

    if (count > modal.list.length) {
      toast.error(`Maximum promotable count is ${modal.list.length}`);
      return;
    }

    setLoading(true);
    try {
      const result = await promoteBatch(
        modal.source,
        modal.target,
        count
      );
      toast.success(result.message);
      closeModal();
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Promotion failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSeniors = async () => {
    setLoading(true);
    try {
      const result = await removeSeniorPrefects();
      toast.success(result.message);
      setShowRemoveConfirm(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove senior prefects');
    } finally {
      setLoading(false);
    }
  };

  const parsedCount = parseInt(promoteCount, 10) || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div
        style={{
          animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards'
        }}
      >
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Promotion
        </h1>
        <p className="text-muted-foreground mt-1">
          Promote prefects through the tier ladder. Points are reset and ranks reassigned on each promotion.
        </p>
      </div>

      {/* ── Tier Promotion Cards ────────────────── */}
      {PROMOTIONS.map(({ source, target }, idx) => {
        const list = tierMap[source] || [];

        return (
          <div
            key={source}
            className="card-elevated p-6 space-y-4"
            style={{
              animation: `fade-up 0.55s cubic-bezier(0.16,1,0.3,1) ${100 + idx * 80}ms forwards`,
              opacity: 0
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <BatchBadge batch={source} />
                <span className="text-sm text-muted-foreground">
                  → <strong>{target}</strong>
                </span>
              </div>

              <span className="font-bold tabular-nums text-sm">
                {list.length} prefects
              </span>
            </div>

            {list.length > 0 ? (
              <div className="space-y-1 pl-2 border-l-2 border-border max-h-48 overflow-y-auto">
                {list.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <Crown className="h-3 w-3 text-gold-dark shrink-0" />
                    <span className="font-medium text-foreground">
                      Rank {p.rank || i + 1}
                    </span>
                    <span>— {p.name}</span>
                    <span className="opacity-60">({p.prefectId})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No active prefects in this tier
              </p>
            )}

            {list.length > 0 && (
              <Button
                variant="gold"
                className="w-full active:scale-[0.97]"
                disabled={loading}
                onClick={() => openModal(source, target, list)}
              >
                Promote {source}
              </Button>
            )}
          </div>
        );
      })}

      {/* ── Remove Senior Prefects Card ─────────── */}
      <div
        className="card-elevated p-6 space-y-4 border-destructive/30"
        style={{
          animation: `fade-up 0.55s cubic-bezier(0.16,1,0.3,1) ${100 + PROMOTIONS.length * 80}ms forwards`,
          opacity: 0
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold">Remove Senior Prefects</h3>
          </div>
          <span className="font-bold tabular-nums text-sm">
            {seniors.length} seniors
          </span>
        </div>

        {seniors.length > 0 ? (
          <div className="space-y-1 pl-2 border-l-2 border-destructive/30 max-h-48 overflow-y-auto">
            {seniors.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Crown className="h-3 w-3 text-gold-dark shrink-0" />
                <span className="font-medium text-foreground">
                  Rank {p.rank || i + 1}
                </span>
                <span>— {p.name}</span>
                <span className="opacity-60">({p.prefectId})</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No active senior prefects
          </p>
        )}

        {seniors.length > 0 && (
          <Button
            variant="destructive"
            className="w-full active:scale-[0.97]"
            disabled={loading}
            onClick={() => setShowRemoveConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove All Senior Prefects
          </Button>
        )}
      </div>

      {/* ── Promote Modal ──────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="card-elevated p-6 w-full max-w-md mx-4 space-y-4"
            onClick={e => e.stopPropagation()}
            style={{
              animation: 'fade-up 0.3s cubic-bezier(0.16,1,0.3,1) forwards'
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5" />
                Promote {modal.source} → {modal.target}
              </h3>

              <button
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Enter how many prefects to promote. Top-ranked prefects will be
              promoted, their <strong>points reset to 0</strong>, and they'll be
              <strong> re-ranked</strong> by who had the most points. The rest
              will be deactivated.
            </p>

            <div className="space-y-2">
              <Label>
                Number to Promote (out of {modal.list.length})
              </Label>
              <Input
                type="number"
                min={0}
                max={modal.list.length}
                value={promoteCount}
                onChange={e => setPromoteCount(e.target.value)}
                placeholder={`0 – ${modal.list.length}`}
                autoFocus
              />
            </div>

            {promoteCount !== '' && (
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <Users className="h-4 w-4" />
                  {parsedCount} promote
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <UserX className="h-4 w-4" />
                  {Math.max(0, modal.list.length - parsedCount)} deactivate
                </span>
              </div>
            )}

            {promoteCount !== '' && modal.list.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {modal.list.map((p, i) => {
                  const willPromote = i < parsedCount;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm transition-colors ${
                        willPromote
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-destructive/10 border border-destructive/20 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold shrink-0">
                          {p.rank || i + 1}
                        </span>

                        <div>
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {p.prefectId}
                          </span>
                        </div>
                      </div>

                      {willPromote ? (
                        <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                          <ArrowUpCircle className="h-3 w-3" />
                          Promote
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-destructive flex items-center gap-1">
                          <UserX className="h-3 w-3" />
                          Deactivate
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 active:scale-[0.97]"
                onClick={closeModal}
                disabled={loading}
              >
                Cancel
              </Button>

              <Button
                variant="gold"
                className="flex-1 active:scale-[0.97]"
                onClick={handlePromote}
                disabled={
                  loading ||
                  promoteCount === '' ||
                  parsedCount < 0
                }
              >
                {loading ? 'Promoting...' : `Promote ${parsedCount}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Seniors Confirm Modal ───────── */}
      {showRemoveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowRemoveConfirm(false)}
        >
          <div
            className="card-elevated p-6 w-full max-w-sm mx-4 space-y-4"
            onClick={e => e.stopPropagation()}
            style={{
              animation: 'fade-up 0.3s cubic-bezier(0.16,1,0.3,1) forwards'
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                Confirm Removal
              </h3>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              This will <strong>deactivate</strong> all{' '}
              <strong>{seniors.length}</strong> Senior Prefect(s). This action
              cannot be undone.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 active:scale-[0.97]"
                onClick={() => setShowRemoveConfirm(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 active:scale-[0.97]"
                onClick={handleRemoveSeniors}
                disabled={loading}
              >
                {loading ? 'Removing...' : 'Remove All'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}