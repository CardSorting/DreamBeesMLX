import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        setupFiles: [
            './src/sdk/tests/vitest.setup.ts'
        ],
        environment: 'jsdom',
        server: {
            deps: {
                inline: [/firebase/],
            },
        },
    },
});
