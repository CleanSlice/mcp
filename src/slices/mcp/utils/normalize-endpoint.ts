/**
 * Normalizes an endpoint by removing double slashes and ensuring it does not start with a slash.
 */
export function normalizeEndpoint(endpoint?: string | null): string {
  try {
    if (!endpoint) {
      return '';
    }

    // Ensure endpoint is a string
    const endpointStr = typeof endpoint === 'string' ? endpoint : String(endpoint);

    // Check if the endpoint has a protocol
    const protocolMatch = endpointStr.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);

    if (protocolMatch) {
      // Has protocol: preserve protocol slashes, collapse slashes in the path
      const protocol = protocolMatch[0]; // e.g., "http://"
      const pathPart = endpointStr.slice(protocol.length);
      const normalizedPath = pathPart.replace(/\/+/g, '/');
      const result = protocol + normalizedPath;
      return result;
    } else {
      // No protocol: collapse all slashes and remove leading slash
      const normalized = endpointStr.replace(/\/+/g, '/');
      const result = normalized.startsWith('/')
        ? normalized.slice(1)
        : normalized;
      return result;
    }
  } catch (error) {
    console.error('Error normalizing endpoint:', error);
    return '';
  }
}
