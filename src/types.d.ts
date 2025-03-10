import { Dispatch, SetStateAction } from 'react';

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

export type Effect<T> = (
  update: React.Dispatch<React.SetStateAction<T>>
) => () => void | void;

export type ContextualStateConfig<T> = {
  key: string;
  initial: T;
  effect?: Effect<T>;
};
