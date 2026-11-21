export interface Point {
  x: number;
  y: number;
}

export type IngressScope = Partial<Record<'node' | 'listener' | 'endpoint', string>>;

export interface TelemetryQuery {
  metric: string;
  scope: IngressScope;
  range?: number;
}

type Subscriber = () => void;

interface Entry {
  query: TelemetryQuery;
  subscribers: Set<Subscriber>;
  points: readonly Point[];
  refreshAt: number;
}

export const noPoints: readonly Point[] = [];
const refreshInterval = 15_000;

export function parseTelemetryPoints(value: unknown): readonly Point[] {
  if (!Array.isArray(value)) return noPoints;
  return value.flatMap((point) =>
    Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)
      ? [{ x: point[0], y: point[1] }]
      : []);
}

// Identical queries share one request and the latest result.
export class IngressTelemetry {
  private timer?: ReturnType<typeof setInterval>;
  private entries = new Map<string, Entry>();
  private pending = new Map<Entry, AbortController>();
  private error = '';
  private errorSubscribers = new Set<Subscriber>();

  getError = () => this.error;

  subscribeError = (subscriber: Subscriber) => {
    this.errorSubscribers.add(subscriber);
    return () => { this.errorSubscribers.delete(subscriber); };
  };

  snapshot(key: string) {
    return this.entries.get(key)?.points ?? noPoints;
  }

  subscribe(key: string, query: TelemetryQuery, subscriber: Subscriber) {
    const entry = this.entries.get(key) ?? {
      query, subscribers: new Set<Subscriber>(), points: noPoints, refreshAt: 0,
    };
    this.entries.set(key, entry);
    entry.subscribers.add(subscriber);
    this.timer ??= setInterval(() => this.refresh(), 1000);
    queueMicrotask(() => this.refresh());

    return () => {
      entry.subscribers.delete(subscriber);
      if (!entry.subscribers.size) {
        this.entries.delete(key);
        this.pending.get(entry)?.abort();
      }
      if (!this.entries.size) {
        clearInterval(this.timer);
        this.timer = undefined;
        this.reportError('');
      }
    };
  }

  private reportError(error: string) {
    if (error === this.error) return;
    this.error = error;
    for (const subscriber of this.errorSubscribers) subscriber();
  }

  private refresh() {
    const now = Date.now();
    const ready = [...this.entries.values()].filter((entry) =>
      entry.refreshAt <= now && !this.pending.has(entry));
    for (const entry of ready.slice(0, Math.max(0, 6 - this.pending.size))) {
      const controller = new AbortController();
      this.pending.set(entry, controller);
      entry.refreshAt = now + refreshInterval;
      void this.query(entry, controller);
    }
  }

  private async query(entry: Entry, controller: AbortController) {
    const { metric, range = 0, scope } = entry.query;
    const parameters = new URLSearchParams({ metric, range: String(range), ...scope });
    try {
      const response = await fetch(`/api/telemetry?${parameters}`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Telemetry is unavailable.');
      entry.points = parseTelemetryPoints(body);
      this.reportError('');
    } catch (error) {
      if (!controller.signal.aborted) {
        entry.points = noPoints;
        if (error instanceof Error) this.reportError(error.message);
      }
    } finally {
      this.pending.delete(entry);
      for (const subscriber of entry.subscribers) subscriber();
      this.refresh();
    }
  }
}
