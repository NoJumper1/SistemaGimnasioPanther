import { build } from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/worker.js'],
  bundle: true,
  outfile: 'dist/worker.js',
  format: 'esm',
  // Importa .ejs como strings de texto plano
  loader: { '.ejs': 'text' },
  platform: 'browser',
  conditions: ['worker', 'browser'],
  // Reemplaza módulos Node.js que EJS importa pero no usa en modo render-from-string
  alias: {
    'fs':   './src/stubs/fs.js',
    'path': './src/stubs/path.js',
  },
  minify: false,
});

console.log('Build completo: dist/worker.js');
