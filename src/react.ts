'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { ReadableSync, WritableSync } from './types';

export function useSyncedValue<T>(store: ReadableSync<T>) {
    return useSyncExternalStore(
        store.synchronize,
        store.getValue,
        store.getValue
    );
}

export function useUpdateSyncedValue<T>(store: WritableSync<T>) {
    return useMemo(() => store.update, [store]);
}

export function useSync<T>(store: WritableSync<T>) {
    const state = useSyncedValue(store);
    const setState = useUpdateSyncedValue(store);

    return [state, setState] as const;
}
