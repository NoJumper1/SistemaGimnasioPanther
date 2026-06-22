import { build } from 'esbuild';
import { readFileSync, mkdirSync } from 'fs';
import ejs from 'ejs';

mkdirSync('dist', { recursive: true });

// Todas las variables que pueden aparecer en cualquier template
const ALL_LOCALS = [
  'title', 'body', 'error', 'layout', 'admin',
  // dashboard
  'counts', 'expiringSoon', 'totalMembers', 'checkinsToday', 'visitsToday',
  // members
  'rows', 'search', 'statusFilter', 'member', 'subscriptions',
  'status', 'endDate', 'plans', 'recentCheckins', 'today', 'plan',
  // checkin
  'recent', 'recentVisits', 'result', 'visitResult',
  // stats
  'kpis', 'charts',
  // screensaver / signage admin
  'images', 'media', 'featured', 'spotifyState', 'spotifyConfigured', 'spotifyMsg',
  // shared
  'STATUS_LABELS', 'STATUS_BADGE_CLASSES',
];

// Plugin: compila cada .ejs a una función JS pura en tiempo de build.
// La función resultante NO usa eval ni new Function en runtime → compatible con Workers.
const ejsPlugin = {
  name: 'ejs-precompile',
  setup(build) {
    build.onLoad({ filter: /\.ejs$/ }, ({ path }) => {
      const template = readFileSync(path, 'utf8');
      const compiled = ejs.compile(template, {
        client: true,
        strict: true,
        _with: false,
        localsName: 'locals',
        destructuredLocals: ALL_LOCALS,
        filename: path,
      });
      return {
        contents: `export default ${compiled.toString()}`,
        loader: 'js',
      };
    });
  },
};

await build({
  entryPoints: ['src/worker.js'],
  bundle: true,
  outfile: 'dist/worker.js',
  format: 'esm',
  platform: 'browser',
  conditions: ['worker', 'browser'],
  plugins: [ejsPlugin],
  minify: false,
});

console.log('Build completo: dist/worker.js');
