# AtlasNet monitoring

AtlasNet nodes expose a Prometheus exporter on loopback and select an ephemeral
port by default. Nodes register the actual metrics address in the existing
AtlasNet registry. `ATLASNET_METRICS_ENABLED=true|false` overrides
`node.metrics.enabled` for each node.

Start AtlasNetStack with a ControlPanel-capable node, then launch
**Cartograph: Dev**. The launcher takes its discovery URL from
`ATLASNET_CONTROL_PANEL_URL`, switches to HTTP or HTTPS, and uses
`/api/v1/metrics/discovery` on the same host and port. The gateway reads
the existing node registry through Database IntentRPC and filters out stopped
exporters. The default cluster label is the Database node UUID. An explicit
`node.metrics.cluster` label on the Control API overrides it.

The launcher writes the generated scrape configuration alongside the local
TSDB. Prometheus queries discovery and scrapes every 15 seconds. Node joins,
departures, and changes to ephemeral metrics ports do not restart Prometheus.
Allow at least two scrapes for rate calculations to have data.

| Setting | Default |
| --- | --- |
| `ATLASNET_CONTROL_PANEL_URL` | Required WebSocket URL. The VS Code launch sets `ws://127.0.0.1:8080`. |
| `CARTOGRAPH_PROMETHEUS_ENABLED` | `true`. Set `false` when using an external server. |
| `CARTOGRAPH_PROMETHEUS_URL` | Local managed Prometheus URL. Set an HTTP(S) base URL for an external server and disable managed Prometheus. |
| `CARTOGRAPH_WEB_PORT` | `5173` on loopback. |
| `PROMETHEUS_EXECUTABLE` | `prometheus` on PATH. Accepts an absolute executable path. |
| `PROMETHEUS_PORT` | `9090` on loopback. |
| `PROMETHEUS_DATA_DIR` | `.cartograph/prometheus/` relative to the repository root. |
| `PROMETHEUS_CONFIG` | `monitoring/prometheus.yml`. Preserve the `# cartograph-discovery` marker in a custom template. |
| `PROMETHEUS_RETENTION` | `15d`. |

The browser queries Cartograph's same-origin telemetry endpoint. Cartograph
runs allowlisted metric queries against Prometheus and scopes them to the
cluster reported by discovery. AtlasNet needs no Prometheus URL for this
workflow. External Prometheus must scrape the Control API discovery endpoint
under job `atlasnet`, preserving `atlasnet_cluster` and `atlasnet_node`
labels. The legacy Compose file is independent of the Cartograph launcher.

The Control API accepts discovery requests from loopback. For remote monitoring,
forward the route through an authenticated or network-restricted reverse proxy
on the Control API host that connects over loopback. Exporter addresses must be
reachable from both the gateway and Prometheus. Bind cross-host exporters to
private IPv4 or IPv6 addresses and restrict access to the monitoring network.

Use the registered node ID, the configured endpoint ID, or the listener label
`Transport:port` in widget settings. Ephemeral ingress listeners use
`Transport:0:index`, where the index is zero-based in the listener list.
The connected-client gauge reports ingress sessions and requires a listener
or endpoint filter in Cartograph. AtlasNet does not expose a stable identity
that can deduplicate distinct simultaneous sessions for one player, so the
default unique-client statistic stays unavailable.

Logical command counts use complete Client V1 messages delivered by the
provider. Signal counts record completed stream writes or deliveries accepted by the
endpoint provider, once per recipient. Listener byte counters use ingress socket API byte counts.
On Linux, TCP bytes sent also include kernel-reported retransmit payload bytes.
TCP receive counters exclude duplicate segments consumed by the kernel.
Steam listener counters measure delivered or submitted messages at its API boundary. Module endpoints
opt in by overriding `IClientEndpoint::ReportsTransportBytes` and calling
`ReportTransportBytes` at their native transport boundary. The exporter omits
endpoint byte series when the module does not provide those measurements.

All nodes in a running cluster should use the same AtlasNet revision because
the node registration message now includes the exporter address. Restart
older nodes to refresh their saved registrations.
