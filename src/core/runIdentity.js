/** Browser-only identity generation; deterministic simulation receives these as input. */
export function createRunIdentity() {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return { runId: globalThis.crypto.randomUUID(), seed: values[0] };
}
