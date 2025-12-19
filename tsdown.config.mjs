import {defineConfig} from 'tsdown';

export default defineConfig({
    entry: ['index.js'],
    outDir: 'build/staging',
    outExtensions: (ctx) => ({ js: '.js'}),
    format: 'cjs',
    target: 'node22',
    external: ['sharp'],
    clean: true,
    noExternal: [/.*/],
    inputOptions: {
        checks: {
            /**
             * ignore eval warning at build time because
             * 1. warning about running eval client-side in a child iframe. This code point is to run code included in any overrides js file within the browser process. It's already running this code in the parent frame so using eval doesn't widen the attach surface.
             * 2. warning about gray-matter javascript eval feature that this code doesn't use at all.
             */
            eval: false
        }
    },
    dts: false,
})