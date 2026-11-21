import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { IngressTelemetry, noPoints, type IngressScope } from '../../api/ingressTelemetry';

export const IngressTelemetryContext = createContext<IngressTelemetry | null>(null);

export function useIngressMetric(metric: string, range: number, scope: IngressScope, enabled: boolean) {
  const telemetry = useContext(IngressTelemetryContext);
  const scopeKey = JSON.stringify(scope);
  const query = useMemo(() => ({ metric, range, scope: JSON.parse(scopeKey) as IngressScope }),
    [metric, range, scopeKey]);
  const key = JSON.stringify(query);
  const subscribe = useCallback((notify: () => void) => {
    if (telemetry && enabled) return telemetry.subscribe(key, query, notify);
    return () => {};
  }, [telemetry, enabled, key, query]);
  const snapshot = useCallback(() => enabled ? telemetry?.snapshot(key) ?? noPoints : noPoints,
    [telemetry, enabled, key]);
  return useSyncExternalStore(subscribe, snapshot);
}
