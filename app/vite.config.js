import { defineConfig } from 'vite';

// The v3 screens are plain JSX that reference a global `React` (set in main.js)
// and global design-token helpers from tokens.js. Compile JSX with the classic
// runtime against that global React — no react plugin / auto-runtime injection.
export default defineConfig({
  // Relative base so it works under any GitHub Pages sub-path.
  base: './',
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
  build: {
    target: 'es2020',
  },
});
