import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addPrefect } from '@/lib/store';
import { Batch } from '@/lib/types';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

export default function AddPrefect() {
  const [name, setName] = useState('');
  const [prefectId, setPrefectId] = useState('');
  const [batch, setBatch] = useState<Batch | ''>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !prefectId.trim() || !batch) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await addPrefect({
        id: crypto.randomUUID(),
        name: name.trim(),
        prefectId: prefectId.trim(),
        batch: batch as Batch,
      });

      toast.success(`${name} added as ${batch} Prefect`);
      setName('');
      setPrefectId('');
      setBatch('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add prefect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <h1 className="text-3xl font-display font-bold tracking-tight">Add New Prefect</h1>
        <p className="text-muted-foreground mt-1">Register a prefect into the system</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card-elevated p-6 space-y-5"
        style={{ animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 100ms forwards', opacity: 0 }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter prefect's name" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pid">Prefect ID</Label>
          <Input id="pid" value={prefectId} onChange={e => setPrefectId(e.target.value)} placeholder="e.g. TP-001" />
        </div>

        <div className="space-y-2">
          <Label>Batch</Label>
          <Select value={batch} onValueChange={v => setBatch(v as Batch)}>
            <SelectTrigger>
              <SelectValue placeholder="Select batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Trainee">Trainee Prefect</SelectItem>
              <SelectItem value="Assistant">Assistant Prefect</SelectItem>
              <SelectItem value="Junior">Junior Prefect</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" variant="gold" className="w-full active:scale-[0.97]" disabled={loading}>
          <UserPlus className="h-4 w-4 mr-2" />
          {loading ? 'Adding...' : 'Add Prefect'}
        </Button>
      </form>
    </div>
  );
}
