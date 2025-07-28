import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: ['src/core/index.ts', 'src/react.ts', 'src/ctx.tsx'],
        format: ['esm', 'cjs'],
        dts: true,
        sourcemap: true,
        clean: true,
        splitting: true,
        target: 'es2020',
        outDir: 'dist',
    },
    // {
    //     entry: ['src/ctx.tsx'],
    //     format: ['esm', 'cjs'],
    //     dts: true,
    //     sourcemap: true,
    //     clean: true,
    //     splitting: true,
    //     target: 'es2020',
    //     outDir: 'dist',
    // },
]);
