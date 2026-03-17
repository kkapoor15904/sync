import { Dispatch, SetStateAction } from 'react';
import { derivedMemory, storeListenerMemory, storeMemory } from './memory';

export type StoreSubscribe = (onStoreChange: () => void) => () => void;

export interface ReadonlySync<T> {
  synchronize: StoreSubscribe;
  getValue: () => T;
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
  params: P
) => WritableSync<T>;

export type GetState<T> = (
  getSyncedValue: <S>(store: ReadableSync<S>) => S
) => T;

export type InferSyncState<T> = T extends ReadableSync<infer S> ? S : never;

export function sync<T>(config: SyncConfig<T>): WritableSync<T> {
  const { key, initial } = config;

  if (typeof window === 'undefined') storeMemory.set(key, initial);

  if (!storeMemory.has(key)) storeMemory.set(key, initial);
  if (!storeListenerMemory.has(key)) storeListenerMemory.set(key, new Set());

  const listeners = storeListenerMemory.get(key)!;

  return {
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

      storeMemory.set(key, newState);

      listeners.forEach((l) => l());
    },
  };
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }

  if (
    a &&
    b &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    Object.getPrototypeOf(a) === Object.prototype &&
    Object.getPrototypeOf(b) === Object.prototype
  ) {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (
        !Object.is(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
      ) {
        return false;
      }
    }
    return true;
  }

  return false;
}

export function derive<T>(getState: GetState<T>): ReadonlySync<T> {
  const subscribers = new Set<() => void>();

  let cachedValue: T;
  let initialized = false;
  let depUnsubs: Array<() => void> = [];

  const recompute = (): T => {
    const nextDeps: ReadableSync<unknown>[] = [];

    const nextValue = getState((store) => {
      nextDeps.push(store);
      return store.getValue();
    });

    depUnsubs.forEach((unsub) => unsub());
    depUnsubs = nextDeps.map((store) =>
      store.synchronize(() => {
        const prev = cachedValue;
        const value = recompute();

        if (!Object.is(value, prev)) {
          subscribers.forEach((listener) => listener());
        }
      })
    );

    if (!initialized || !shallowEqual(cachedValue, nextValue)) {
      cachedValue = nextValue;
    }

    initialized = true;

    return cachedValue;
  };

  const ensureInitialized = () => {
    if (!initialized) recompute();
  };

  return {
    synchronize: (onStoreChange) => {
      subscribers.add(onStoreChange);
      ensureInitialized();

      return () => {
        subscribers.delete(onStoreChange);

        if (subscribers.size === 0) {
          depUnsubs.forEach((unsub) => unsub());
          depUnsubs = [];
          initialized = false;
        }
      };
    },
    getValue: () => {
      ensureInitialized();
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
  fn: T
) {
  return (...params: Parameters<T>) => {
    const uniqueId = params.map((param) => String(param)).join('_');

    if (!derivedMemory.has(uniqueId))
      derivedMemory.set(uniqueId, fn(...params));

    return derivedMemory.get(uniqueId)! as ReturnType<T>;
  };
}
