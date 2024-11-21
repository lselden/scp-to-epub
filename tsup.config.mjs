import {defineConfig} from 'tsup';

export default defineConfig({
    entry: ['index.js'],
    outDir: 'build/staging',
    format: 'cjs',
    target: 'node20',
    external: [/.*(sharp).*/],
    clean: true,
    noExternal: [/.*/]
})