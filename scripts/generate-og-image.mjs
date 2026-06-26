// Generates public/og-default.png (1200x630) from an inline SVG via sharp.
// Run: node scripts/generate-og-image.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og-default.png');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#1c1c20" stroke-width="1"/>
    </pattern>
    <radialGradient id="glow" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#1d4ed8" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#09090b" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#09090b"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="84" y="96" width="64" height="64" rx="12" fill="#2563eb"/>
  <text x="116" y="141" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" fill="#ffffff">S</text>
  <text x="168" y="140" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="600" fill="#a1a1aa">Srenix</text>
  <text x="84" y="300" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="700" fill="#fafafa">Agentic SRE</text>
  <text x="84" y="384" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="500" fill="#60a5fa">The AI SRE for Kubernetes</text>
  <text x="84" y="476" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#a1a1aa">Detect. Remediate. Verify. &#8212; policy-bounded, audit-anchored, bring-your-own-LLM</text>
  <text x="84" y="552" font-family="Courier New, monospace" font-size="26" fill="#71717a">$ helm install srenix srenix/agentic-sre</text>
  <rect x="0" y="622" width="1200" height="8" fill="#2563eb"/>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('wrote', out);
