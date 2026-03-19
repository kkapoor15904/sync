import deepEqual from 'fast-deep-equal';
import type { Dispatch, SetStateAction } from 'react';
import { derivedMemory, storeListenerMemory, storeMemory } from './memory';

export { deepEqual };

export type StoreSubscribe = (onStoreChange: () => void) => () => void;

export interface ReadonlySync<T> {
  synchronize: StoreSubscribe;
  getValue: () => T;
  // Stable identity used by fixed-mode derive dependency tracking.
  __storeKey?: string;
}
export interface WritableSync<T> extends ReadonlySync<T> {
  update: Dispatch<SetStateAction<T>>;
}
export type ReadableSync<T> = WritableSync<T> | ReadonlySync<T>;
export interface SyncConfig<T> {
  key: string;
  initial: T;
}

export type SyncWithParams<T> = <P extends string | number>(
  params: P,
) => WritableSync<T>;

export type GetState<T> = (
  getSyncedValue: <S>(store: ReadableSync<S>) => S,
) => T;

export type InferSyncState<T> = T extends ReadableSync<infer S> ? S : never;

let derivedIdCounter = 0;

function getStoreKey<S>(store: ReadableSync<S>): string {
  const key = store.__storeKey;
  if (!key) {
    throw new Error(
      'derive(): fixed-mode dependency tracking requires stores created by sync()/syncWithParams()/derive() to have a stable __storeKey.',
    );
  }
  return key;
}

export function sync<T>(config: SyncConfig<T>): WritableSync<T> {
  const { key, initial } = config;

  if (typeof window === 'undefined') storeMemory.set(key, initial);

  if (!storeMemory.has(key)) storeMemory.set(key, initial);
  if (!storeListenerMemory.has(key)) storeListenerMemory.set(key, new Set());

  const listeners = storeListenerMemory.get(key)!;

  return {
    __storeKey: key,
    synchronize: (onStoreChange) => {
      listeners.add(onStoreChange);

      return () => {
        listeners.delete(onStoreChange);
      };
    },
    getValue: () => storeMemory.get(key) as T,
    update: (value) => {
      const prevState = storeMemory.get(key) as T;
      const newState = value instanceof Function ? value(prevState) : value;

      if (deepEqual(prevState, newState)) return;

      storeMemory.set(key, newState);

      listeners.forEach((l) => l());
    },
  };
}

export function derive<T>(getState: GetState<T>): ReadonlySync<T> {
  const listeners = new Set<() => void>();

  let cachedValue: T;
  let computed = false;

  // Dynamic dependency tracking:
  // - depKeySet: dependency set from the most recent compute
  // - depStores: last-seen store instance for each depKey (for subscribe/unsubscribe)
  // - depUnsubsByKey: unsubscribe fn per depKey
  let depKeySet = new Set<string>();
  const depStores = new Map<string, ReadableSync<unknown>>();
  const depUnsubsByKey = new Map<string, () => void>();
  let depsSubscribed = false;

  // Recompute scheduling:
  // We mark dirty when deps change, then recompute at microtask boundary.
  let dirty = false;
  let scheduled = false;

  // Cycle guard:
  // If derived recompute re-enters itself synchronously, we throw instead of recursing forever.
  let computing = false;

  const queue = (fn: () => void) => {
    if (typeof queueMicrotask === 'function') queueMicrotask(fn);
    else Promise.resolve().then(fn);
  };

  const compute = () => {
    if (computing) {
      throw new Error(
        'derive(): infinite recursion detected (re-entrant compute). Check for dependency cycles.',
      );
    }
    computing = true;

    try {
      const nextDepKeys = new Set<string>();

      const value = getState((store) => {
        const storeKey = getStoreKey(store);
        nextDepKeys.add(storeKey);
        depStores.set(storeKey, store as ReadableSync<unknown>);
        return store.getValue();
      });

      return { value, nextDepKeys };
    } finally {
      computing = false;
    }
  };

  const resubscribeDeps = (nextDepKeys: Set<string>) => {
    // Unsubscribe deps that are no longer used.
    for (const key of depKeySet) {
      if (nextDepKeys.has(key)) continue;
      const unsub = depUnsubsByKey.get(key);
      if (unsub) unsub();
      depUnsubsByKey.delete(key);
    }

    // Subscribe deps that were newly introduced.
    for (const key of nextDepKeys) {
      if (depKeySet.has(key)) continue;
      const store = depStores.get(key);
      if (!store) {
        // Should not happen: depStores are populated during compute().
        throw new Error(
          'derive(): internal error while subscribing to dynamic dependencies',
        );
      }
      const unsub = store.synchronize(scheduleRecompute);
      depUnsubsByKey.set(key, unsub);
    }

    depKeySet = nextDepKeys;
  };

  const ensureComputed = () => {
    if (computed) return;

    const { value, nextDepKeys } = compute();
    cachedValue = value;
    depKeySet = nextDepKeys;
    computed = true;

    // If there are active subscribers, make sure we're listening to current deps.
    if (depsSubscribed) resubscribeDeps(nextDepKeys);
  };

  const recomputeAndNotify = () => {
    dirty = false;
    if (listeners.size === 0) return;

    const { value, nextDepKeys } = compute();

    // Update dependency subscriptions to match the new dependency set.
    if (depsSubscribed) resubscribeDeps(nextDepKeys);
    else depKeySet = nextDepKeys;

    if (!deepEqual(cachedValue, value)) {
      cachedValue = value;
      listeners.forEach((l) => l());
    }
  };

  const teardownDeps = () => {
    for (const unsub of depUnsubsByKey.values()) unsub();
    depUnsubsByKey.clear();
    depKeySet = new Set<string>();
    depsSubscribed = false;
    dirty = false;
    scheduled = false;
  };

  const scheduleRecompute = () => {
    if (listeners.size === 0) return;
    dirty = true;
    if (scheduled) return;
    scheduled = true;

    queue(() => {
      scheduled = false;
      if (!dirty) return;
      recomputeAndNotify();
    });
  };

  const __storeKey = `derived:${++derivedIdCounter}`;

  return {
    __storeKey,
    synchronize: (onStoreChange) => {
      listeners.add(onStoreChange);

      if (!computed) ensureComputed();

      if (!depsSubscribed) {
        // Subscribe to the dependencies from the last compute.
        for (const key of depKeySet) {
          const store = depStores.get(key);
          if (!store) {
            throw new Error('derive(): internal error while subscribing');
          }
          const unsub = store.synchronize(scheduleRecompute);
          depUnsubsByKey.set(key, unsub);
        }
        depsSubscribed = true;
      }

      return () => {
        listeners.delete(onStoreChange);
        if (listeners.size === 0) teardownDeps();
      };
    },
    getValue: () => {
      ensureComputed();
      return cachedValue;
    },
  };
}

export function syncWithParams<T>({ key, initial }: SyncConfig<T>) {
  return <P extends string | number>(params: P) =>
    sync({ key: `${key}__${params}`, initial });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function memoize<T extends (...args: any[]) => ReadonlySync<any>>(
  fn: T,
) {
  return (...params: Parameters<T>) => {
    const uniqueId = params.map((param) => String(param)).join('_');

    if (!derivedMemory.has(uniqueId))
      derivedMemory.set(uniqueId, fn(...params));

    return derivedMemory.get(uniqueId)! as ReturnType<T>;
  };
}
