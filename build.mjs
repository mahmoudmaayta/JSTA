import * as esbuild from 'esbuild';
import { builtinModules } from 'node:module';

// Build server with proper externals
await esbuild.build({
  entryPoints: ['server/index-prod.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  external: [
    // Node.js built-in modules
    ...builtinModules,
    ...builtinModules.map(m => `node:${m}`),
    // Native dependencies that can't be bundled
    'pg-native',
    '@neondatabase/serverless',
    'bufferutil',
    'utf-8-validate',
  ],
  minify: false,
  sourcemap: false,
  logLevel: 'info',
});

console.log('✓ Server build complete');
