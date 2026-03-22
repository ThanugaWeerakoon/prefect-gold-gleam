import { Batch, BATCH_COLORS } from '@/lib/types';

export function BatchBadge({ batch }: { batch: Batch }) {
  const colors = BATCH_COLORS[batch];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
      {batch}
    </span>
  );
}
