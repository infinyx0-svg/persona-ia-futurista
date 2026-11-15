import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'src/components');
mkdirSync(outDir, { recursive: true });

const result = await build({
  entryPoints: [resolve(root, 'viewer/src/main.ts')],
  bundle: true,
  format: 'iife',
  target: ['es2019'],
  minify: true,
  write: false,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
});

const js = result.outputFiles[0].text;
const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" />
<style>
  html,body{margin:0;padding:0;height:100%;overflow:hidden;background:transparent;}
  #c{display:block;width:100vw;height:100vh;background:transparent;}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>${js}</script>
</body>
</html>`;

const out = resolve(outDir, 'viewerHtml.ts');
writeFileSync(
  out,
  `// GENERADO AUTOMATICAMENTE por viewer/build.mjs — no editar a mano.\n` +
    `// Bundle de three.js + @pixiv/three-vrm para el visor 3D del personaje.\n` +
    `export const VIEWER_HTML = ${JSON.stringify(html)};\n`
);

console.log(`viewerHtml.ts generado: ${(html.length / 1024).toFixed(0)} KB`);
