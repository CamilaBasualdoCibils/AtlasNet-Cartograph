declare global {
  interface Window {
    cartographConfig?: { endpoint?: string };
  }
}

export function getEndpoint(): string {
  const endpoint = window.cartographConfig?.endpoint;
  if (!endpoint) throw new Error('Cartograph is missing ATLASNET_CONTROL_PANEL_URL runtime configuration.');
  return endpoint;
}
