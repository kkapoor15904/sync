import { ReadonlySync } from '.';

declare global {
    // on the client this will live on window and survive HMR;
    // on the server it never gets used.
    let __STORE_MEMORY__: Map<string, unknown> | undefined;
    let __LISTENER_MEMORY__: Map<string, Set<() => void>> | undefined;
}

// on the client: reuse the same Map across imports/HMR
// on the server: always new, so each SSR render sees a fresh memory
export const storeMemory: Map<string, unknown> =
    typeof window === 'undefined'
        ? new Map()
        : (globalThis.__STORE_MEMORY__ ??= new Map());

export const storeListenerMemory: Map<
    string,
    Set<() => void>
> = typeof window === 'undefined'
    ? new Map()
    : (globalThis.__LISTENER_MEMORY__ ??= new Map());

export const derivedMemory = new Map<string, ReadonlySync<unknown>>();
