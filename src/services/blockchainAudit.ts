const BLOCKCHAIN_BASE_URL = (import.meta.env.VITE_BLOCKCHAIN_URL as string | undefined)?.trim() || 'http://localhost:8000';

export interface BlockchainBlock {
  eventtype: string;
  data: string;
  timestamp: number;
  previous_hash: string;
  current_hash: string;
}

function enrichEventData(data: unknown): Record<string, unknown> {
  const baseData: Record<string, unknown> = data && typeof data === 'object'
    ? { ...(data as Record<string, unknown>) }
    : { value: data };

  try {
    const actorEmail = localStorage.getItem('email');
    const actorRole = localStorage.getItem('role');
    if (actorEmail && !baseData.actorEmail) {
      baseData.actorEmail = actorEmail;
    }
    if (actorRole && !baseData.actorRole) {
      baseData.actorRole = actorRole;
    }
  } catch {
    return baseData;
  }

  return baseData;
}

function stringifyEventData(data: unknown): string {
  const enriched = enrichEventData(data);
  try {
    return JSON.stringify(enriched);
  } catch {
    return String(enriched.value ?? '');
  }
}

export async function postBlockchainEvent(eventtype: string, data: unknown, timestamp = Date.now()): Promise<void> {
  const response = await fetch(`${BLOCKCHAIN_BASE_URL}/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventtype,
      data: stringifyEventData(data),
      timestamp,
    }),
  });

  if (!response.ok) {
    throw new Error(`Blockchain log failed with status ${response.status}`);
  }
}

export async function safeRecordBlockchainEvent(eventtype: string, data: unknown): Promise<void> {
  try {
    await postBlockchainEvent(eventtype, data);
  } catch (error) {
    console.warn('Blockchain audit log skipped:', error);
  }
}

export async function getBlockchainBlocks(): Promise<BlockchainBlock[]> {
  const response = await fetch(`${BLOCKCHAIN_BASE_URL}/blocks`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Could not load blockchain blocks (status ${response.status})`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) return [];

  return payload as BlockchainBlock[];
}
