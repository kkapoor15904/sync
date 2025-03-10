'use client';

import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import { ContextualStateConfig } from './types';

export function createContextualState<T>({
  key,
  initial,
  effect,
}: ContextualStateConfig<T>) {
  const ctxS = createContext(initial);
  const ctxSS = createContext<React.Dispatch<React.SetStateAction<T>>>(
    () => {}
  );

  const Wrapper = (props: PropsWithChildren) => {
    const [state, setState] = useState(initial);

    useEffect(() => {
      if (!effect) return;

      const cleanup = effect(setState);

      return cleanup;
    }, []);

    return (
      <ctxS.Provider value={state}>
        <ctxSS.Provider value={setState}>{props.children}</ctxSS.Provider>
      </ctxS.Provider>
    );
  };

  Wrapper.displayName = `Synced(${key.charAt(0).toUpperCase() + key.slice(1)})`;

  const useCtxState = () => useContext(ctxS);
  const useCtxSetState = () => useContext(ctxSS);

  Wrapper.useSyncedValue = useCtxState;
  Wrapper.useUpdateSyncedValue = useCtxSetState;

  return Wrapper;
}
