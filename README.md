# Sync

A lightweight and flexible state synchronization library for React applications. This package provides utilities for managing and syncing state across components with a simple and intuitive API.

## Features

-   🔄 Synchronized state management across components
-   🎣 React hooks for easy state access and updates
-   📦 TypeScript support out of the box
-   🎯 Context-based state management
-   🔌 External store subscription support

## Installation

```bash
npm install @kkapoor/sync
# or
yarn add @kkapoor/sync
# or
pnpm add @kkapoor/sync
```

## Usage

### Importing

The package provides three main entry points:

```tsx
// Core functionality
import { ... } from '@kkapoor/sync/core';

// React hooks
import { useSync, useSyncedValue, useUpdateSyncedValue } from '@kkapoor/sync/react';

// Context utilities
import { createContextualState } from '@kkapoor/sync/ctx';
```

### Basic State Sync

```tsx
import { useSync } from '@kkapoor/sync/react';

function MyComponent() {
    const [state, setState] = useSync(myStore);

    return (
        <div>
            <p>Current value: {state}</p>
            <button onClick={() => setState(newValue)}>Update</button>
        </div>
    );
}
```

### Contextual State

```tsx
import { createContextualState } from '@kkapoor/sync/ctx';

const MyState = createContextualState({
    key: 'myState',
    initial: { count: 0 },
    effect: (setState) => {
        // Optional effect setup
        return () => {
            // Optional cleanup
        };
    },
});

function App() {
    return (
        <MyState>
            <MyComponent />
        </MyState>
    );
}

function MyComponent() {
    const [state, setState] = MyState.useSync();

    return (
        <div>
            <p>Count: {state.count}</p>
            <button onClick={() => setState({ count: state.count + 1 })}>
                Increment
            </button>
        </div>
    );
}
```

### Derived State

```tsx
import { sync, derive } from '@kkapoor/sync/core';

// Create base stores
const firstNameStore = sync({ key: 'firstName', initial: 'John' });
const lastNameStore = sync({ key: 'lastName', initial: 'Doe' });

// Create a derived store
const fullNameStore = derive((get) => ({
    fullName: `${get(firstNameStore)} ${get(lastNameStore)}`,
}));

function NameDisplay() {
    const fullName = useSyncedValue(fullNameStore);
    return <p>Full Name: {fullName.fullName}</p>;
}
```

## API Reference

### Hooks

-   `useSyncedValue(store)`: Subscribe to a store's value
-   `useUpdateSyncedValue(store)`: Get the update function for a store
-   `useSync(store)`: Get both the value and update function (similar to useState)

### Contextual State

-   `createContextualState(config)`: Create a new contextual state provider
    -   `key`: Unique identifier for the state
    -   `initial`: Initial state value
    -   `effect`: Optional effect function for setup/cleanup

## TypeScript Support

The package is written in TypeScript and provides full type definitions out of the box.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC © [Krishna Kapoor](https://github.com/kkapoor15904)
