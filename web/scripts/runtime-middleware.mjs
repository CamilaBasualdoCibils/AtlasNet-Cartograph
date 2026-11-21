import { atlasNetConfig } from './atlasnet-config.mjs';
import { runtimeConfigScript } from './runtime-config.mjs';
import { telemetryMiddleware } from './telemetry.mjs';

export function runtimeMiddleware() {
  const { discovery } = atlasNetConfig();
  const script = runtimeConfigScript();
  const telemetry = telemetryMiddleware(discovery);
  return (request, response, next) => {
    if (request.url?.split('?')[0] !== '/runtime-config.js') {
      return telemetry(request, response, next);
    }
    response.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(script);
  };
}
