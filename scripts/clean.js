const rimraf = require('rimraf');

const globs = [
  'node_modules',
  '.turbo',
  'tsconfig.tsbuildinfo',
  'apps/*/node_modules',
  'apps/*/.next',
  'apps/*/dist',
  'apps/*/build',
  'apps/*/tsconfig.tsbuildinfo',
  'packages/*/node_modules',
  'packages/*/dist',
  'packages/*/build',
  'packages/*/tsconfig.tsbuildinfo',
];

globs.forEach(pattern => {
  rimraf.sync(pattern, { glob: true });
});

console.log('Clean complete.');
