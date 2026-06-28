// ******************************************************
// VITEST CONFIG — integration test runner
// ******************************************************

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    // Node environment (not jsdom) — we test an Express API
    environment: 'node',

    // Expose describe/it/expect as globals (CommonJS-friendly, no import needed)
    globals: true,

    // Start in-memory MongoDB and connect before any test file runs
    setupFiles: ['./tests/setup.js'],

    // Only files ending in .test.js inside tests/
    include: ['tests/**/*.test.js'],

    // Run test files one at a time — shared DB setup is simpler this way
    fileParallelism: false,
  },
});
