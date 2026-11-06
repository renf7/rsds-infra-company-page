const listeners = new Set<() => void>();
let pending = 0;
let navigating = false;
const publish = () => { for (const listener of listeners) listener(); };
export const activity = {
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  snapshot: () => pending > 0 || navigating,
  serverSnapshot: () => false,
};
export async function runAction<T>(action: () => Promise<T>): Promise<T> {
  pending++; publish();
  try { return await action(); }
  finally { pending--; publish(); }
}
export function beginNavigation() { navigating = true; publish(); }
export function endNavigation() { navigating = false; publish(); }
