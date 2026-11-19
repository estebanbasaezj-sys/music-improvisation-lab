import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

/** Tras compilar, lista todos los archivos publicados para que la app pueda empaquetarse a sí misma (.zip). */
function appManifest(): Plugin {
  return {
    name: 'app-manifest',
    apply: 'build',
    closeBundle() {
      const root = 'dist';
      const files: string[] = [];
      const walk = (d: string) => readdirSync(d).forEach((f) => { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(relative(root, p)); });
      walk(root);
      copyFileSync(join(root, 'index.html'), join(root, 'app-index.html'));
      writeFileSync(join(root, 'app-files.json'), JSON.stringify(files.filter((f) => !['app-files.json', 'app-index.html', 'index.html'].includes(f))));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), appManifest()],
  worker: { format: 'es' },
  // ONNX Runtime Web (separación con IA) localiza sus .wasm junto a su módulo: sin pre-empaquetarlo en desarrollo
  optimizeDeps: { exclude: ['onnxruntime-web', '@audio/neural-runtime', '@audio/neural-separate'] },
  test: { globals: true, environment: 'node' },
});
