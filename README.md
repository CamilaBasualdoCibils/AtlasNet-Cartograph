# Cartograph

Cartograph is the web management panel for AtlasNet. The initial panel provides
endpoint setup and customizable Tabler dashboards. Widgets display an unavailable
state until a telemetry provider is connected.

## Development

Use Node.js 20.19+ on the 20.x line, or Node.js 22.12 or newer. Install
[Prometheus](https://prometheus.io/download/) locally and put the
`prometheus` executable on your PATH.

From the repository root, run `npm install`. Open that directory in VS Code,
select **Cartograph: Dev** from **Run and Debug**, and press F5. **Stop**
terminates both Vite and Prometheus. By default, Vite serves
`http://127.0.0.1:5173`, Prometheus serves `http://127.0.0.1:9090`, and
Prometheus stores development data in the ignored `.cartograph/prometheus/`
directory. Both services write prefixed logs to the debug terminal.

VS Code supplies `ATLASNET_CONTROL_PANEL_URL=ws://127.0.0.1:8080` for the
development launch. From a shell, set the address explicitly:

```sh
ATLASNET_CONTROL_PANEL_URL=ws://127.0.0.1:8080 npm run dev
```

For Vite alone, use `npm run dev:web` with the same environment variable.
The endpoint is delivered at runtime. Changing it requires restarting the
launcher.

## Production

Build the frontend, then start the web server and its managed Prometheus:

```sh
npm run build
ATLASNET_CONTROL_PANEL_URL=wss://atlasnet.example.com npm start
```

The server listens on loopback. Expose it through an authenticated reverse
proxy for shared deployments. The Control API must provide both the management
WebSocket and the discovery route on the configured authority. See the
[monitoring guide](monitoring/README.md) for remote discovery and external
Prometheus.

## Dashboards

Open **Edit Dashboard** to add, configure, duplicate, move, resize, or remove
widgets. **Save** applies changes and **Cancel** discards the draft. Grid
positions are saved separately for desktop, tablet, and mobile. Use the
dashboard selector and **Dashboard actions** to manage dashboards or restore
the built-in Cluster Overview.

Dashboard definitions and the selected dashboard are stored in this browser.
The time-series widget uses Apache ECharts and loads its renderer when the
shared telemetry provider has data for the selected range.

Run dashboard tests with `npm test` from `web/`.

## AtlasNet telemetry

See [monitoring](monitoring/README.md) for launcher settings, AtlasNet discovery,
and using an external Prometheus server.
