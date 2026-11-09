export function isPayloadTooLargeError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  if (!('type' in err)) {
    return false;
  }
  return err.type === 'entity.too.large';
}
