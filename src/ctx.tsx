'use client';

import React, {
    createContext,
    PropsWithChildren,
    useContext,
    useEffect,
    useState,
} from 'react';

export type ContextualStateConfig<T> = {
    key: string;
    initial: T;
    effect?: Effect<T>;
};

export type Effect<T> = (
    update: React.Dispatch<React.SetStateAction<T>>
) => () => void | void;

export function createContextualState<T>({
    key,
    initial,
    effect,
}: ContextualStateConfig<T>) {
    const ctxS = createContext(initial);
    const ctxSS = createContext<React.Dispatch<React.SetStateAction<T>>>(
        () => {}
    );

    const Wrapper = (
        props: PropsWithChildren<{ overrideInitialState?: T }>
    ) => {
        const [state, setState] = useState(
            () => props.overrideInitialState ?? initial
        );

        useEffect(() => {
            if (!effect) return;

            const cleanup = effect(setState);

            return cleanup;
        }, []);

        return (
            <ctxS.Provider value={state}>
                <ctxSS.Provider value={setState}>
                    {props.children}
                </ctxSS.Provider>
            </ctxS.Provider>
        );
    };

    Wrapper.displayName = `Synced(${
        key.charAt(0).toUpperCase() + key.slice(1)
    })`;

    const useCtxState = () => useContext(ctxS);
    const useCtxSetState = () => useContext(ctxSS);

    Wrapper.useSyncedValue = useCtxState;
    Wrapper.useUpdateSyncedValue = useCtxSetState;
    Wrapper.useSync = () => {
        return [useCtxState(), useCtxSetState()] as const;
    };

    return Wrapper;
}
