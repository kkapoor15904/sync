import {
    GetState,
    ReadonlySync,
    StoreSubscribe,
    SyncConfig,
    WritableSync,
} from '../types';
import { derivedMemory, storeListenerMemory, storeMemory } from './memory';

export function sync<T>(config: SyncConfig<T>): WritableSync<T> {
    const { key, initial } = config;

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
            const newState =
                value instanceof Function ? value(prevState) : value;

            storeMemory.set(key, newState);

            listeners.forEach((l) => l());
        },
    };
}

export function derive<T>(getState: GetState<T>): ReadonlySync<T> {
    const subscribers = new Set<StoreSubscribe>();

    return {
        synchronize: (onStoreChange) => {
            const unSubFns = [...subscribers].map((sub) => sub(onStoreChange));

            return () => {
                unSubFns.forEach((fn) => fn());
            };
        },
        getValue: () => {
            return getState((store) => {
                subscribers.add(store.synchronize);
                return store.getValue();
            });
        },
    };
}

export function syncWithParams<T>({ key, initial }: SyncConfig<T>) {
    return <P extends string | number>(params: P) =>
        sync({ key: `${key}__${params}`, initial });
}

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
