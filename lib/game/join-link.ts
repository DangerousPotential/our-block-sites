/** A phone cannot use the laptop's loopback address. */
export function isLoopbackOrigin(value: string) {
  try {
    return ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(
      new URL(value).hostname,
    );
  } catch {
    return false;
  }
}

function httpOrigin(value: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function joinOrigins(
  current: string,
  configured = '',
  network: string[] = [],
) {
  const override = httpOrigin(configured);
  if (override) return [override];
  if (!isLoopbackOrigin(current)) return [current];
  const available = [
    ...new Set(
      network
        .map(httpOrigin)
        .filter(
          (origin): origin is string => !!origin && !isLoopbackOrigin(origin),
        ),
    ),
  ];
  return available.length ? available : [current];
}

export function roomJoinUrl(origin: string, code: string, path = '/') {
  const url = new URL(path, origin);
  url.searchParams.set('join', code);
  return url.href;
}
