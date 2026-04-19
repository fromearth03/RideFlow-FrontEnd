import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Activity, Copy, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getBlockchainBlocks, type BlockchainBlock } from '@/services/blockchainAudit';
import { useToast } from '@/hooks/use-toast';

interface ActivityItem {
  id: string;
  eventType: string;
  eventLabel: string;
  userLabel: string;
  details: string;
  timestamp: number;
  previousHash: string;
  currentHash: string;
  searchText: string;
}

function toEventLabel(eventType: string): string {
  return eventType
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseData(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    return { value: raw };
  }
}

function formatDetails(data: Record<string, unknown>): string {
  const entries = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${String(value)}`);

  if (entries.length === 0) return 'No additional details';
  return entries.join(' • ');
}

function resolveUserLabel(data: Record<string, unknown>): string {
  const userCandidate =
    data.actorEmail ??
    data.email ??
    data.userEmail ??
    data.username ??
    data.userId ??
    data.driverId ??
    data.dispatcherId ??
    data.customerId;

  if (userCandidate === undefined || userCandidate === null || String(userCandidate).trim() === '') {
    return 'System';
  }

  return String(userCandidate);
}

function normalizeBlock(block: BlockchainBlock, index: number): ActivityItem {
  const parsedData = parseData(block.data);
  const eventType = String(block.eventtype || 'UNKNOWN_EVENT').toUpperCase();
  const eventLabel = toEventLabel(eventType);
  const userLabel = resolveUserLabel(parsedData);
  const details = formatDetails(parsedData);
  const timestamp = Number(block.timestamp) || 0;

  return {
    id: `${block.current_hash || 'hash'}-${index}`,
    eventType,
    eventLabel,
    userLabel,
    details,
    timestamp,
    previousHash: String(block.previous_hash || ''),
    currentHash: String(block.current_hash || ''),
    searchText: `${eventType} ${eventLabel} ${userLabel} ${details} ${block.previous_hash || ''} ${block.current_hash || ''}`.toLowerCase(),
  };
}

const AdminActivityPage = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const blocks = await getBlockchainBlocks();
      const normalized = blocks
        .filter(block => String(block.eventtype || '').toUpperCase() !== 'GENESIS')
        .map(normalizeBlock)
        .sort((left, right) => right.timestamp - left.timestamp);
      setItems(normalized);
    } catch (loadError: unknown) {
      const message = (loadError as { message?: string })?.message || 'Failed to load blockchain activity.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const eventTypes = useMemo(() => {
    return Array.from(new Set(items.map(item => item.eventType)));
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const fromMs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toMs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

    return items.filter(item => {
      if (eventFilter !== 'all' && item.eventType !== eventFilter) return false;
      if (keyword && !item.searchText.includes(keyword)) return false;
      if (fromMs !== null && item.timestamp < fromMs) return false;
      if (toMs !== null && item.timestamp > toMs) return false;
      return true;
    });
  }, [items, eventFilter, search, fromDate, toDate]);

  const copyHash = useCallback(async (label: 'Previous' | 'Current', hash: string) => {
    if (!hash) {
      toast({ title: `${label} hash not available`, variant: 'destructive' });
      return;
    }

    try {
      await navigator.clipboard.writeText(hash);
      toast({ title: `${label} hash copied` });
    } catch {
      toast({ title: `Failed to copy ${label.toLowerCase()} hash`, variant: 'destructive' });
    }
  }, [toast]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Activity Log</h1>
            <p className="text-sm text-muted-foreground">Blockchain-backed system activity and audit trail.</p>
          </div>
          <Button variant="outline" onClick={loadActivity} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-lg border bg-card p-3">
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search by keyword, email, ride, vehicle..."
            className="text-black dark:text-foreground placeholder:text-black/60 dark:placeholder:text-foreground/60"
          />

          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="text-black dark:text-foreground">
              <SelectValue placeholder="All event types" />
            </SelectTrigger>
            <SelectContent className="text-black dark:text-foreground">
              <SelectItem value="all" className="text-black dark:text-foreground">All event types</SelectItem>
              {eventTypes.map(eventType => (
                <SelectItem key={eventType} value={eventType} className="text-black dark:text-foreground">
                  {toEventLabel(eventType)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={fromDate}
            onChange={event => setFromDate(event.target.value)}
            className="text-black dark:text-foreground [color-scheme:light] dark:[color-scheme:dark]"
          />
          <Input
            type="date"
            value={toDate}
            onChange={event => setToDate(event.target.value)}
            className="text-black dark:text-foreground [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && (
          <div className="space-y-2">
            {filteredItems.map(item => (
              <div key={item.id} className="flex items-start gap-3 rounded-lg border bg-card p-4">
                <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-card-foreground">{item.eventLabel}</span>
                    <span className="status-badge status-assigned text-[10px]">{item.eventType}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 break-words">{item.details}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.userLabel} · {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Unknown time'}
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
                    <div className="rounded-md border bg-muted/30 p-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide">Previous hash</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={() => copyHash('Previous', item.previousHash)}
                        >
                          <Copy className="mr-1 h-3 w-3" /> Copy
                        </Button>
                      </div>
                      <p className="font-mono break-all">{item.previousHash || '—'}</p>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide">Current hash</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={() => copyHash('Current', item.currentHash)}
                        >
                          <Copy className="mr-1 h-3 w-3" /> Copy
                        </Button>
                      </div>
                      <p className="font-mono break-all">{item.currentHash || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground text-center">
                No blockchain activity matches the current filters.
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminActivityPage;
