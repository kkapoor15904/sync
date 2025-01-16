import { ReadonlySync } from '../types';

export const storeMemory = new Map<string, unknown>();
export const storeListenerMemory = new Map<string, Set<() => void>>();
export const derivedMemory = new Map<string, ReadonlySync<unknown>>();
