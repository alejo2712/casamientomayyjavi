/**
 * generate-placeholders.js
 * Creates SVG placeholder images for backgrounds and frames.
 * Run with: node scripts/generate-placeholders.js
 *
 * Replace these files with real images before deploying.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BG_DIR = path.join(ROOT, 'assets', 'backgrounds');
const FRAME_DIR = path.join(ROOT, 'assets', 'frames');

function svgBackground(label, gradientFrom, gradientTo, emoji) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gradientFrom}"/>
      <stop offset="100%" stop-color="${gradientTo}"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#g)"/>
  <text x="540" y="480" text-anchor="middle" font-size="120" opacity="0.3">${emoji}</text>
  <text x="540" y="580" text-anchor="middle" font-family="Georgia,serif" font-size="52" fill="white" opacity="0.9">${label}</text>
  <text x="540" y="640" text-anchor="middle" font-family="Georgia,serif" font-size="28" fill="white" opacity="0.6">Mailen &amp; Javier 2025</text>
  <text x="540" y="800" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="white" opacity="0.4">[ Replace with real image ]</text>
</svg>`;
}

function svgFrame(label, strokeColor, emoji) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="none"/>
  <!-- Outer border -->
  <rect x="20" y="20" width="1040" height="1040" rx="24" ry="24"
        fill="none" stroke="${strokeColor}" stroke-width="28" opacity="0.85"/>
  <!-- Inner border -->
  <rect x="55" y="55" width="970" height="970" rx="16" ry="16"
        fill="none" stroke="${strokeColor}" stroke-width="10" opacity="0.45"/>
  <!-- Corner decorations -->
  <text x="60" y="100" font-size="64" opacity="0.7">${emoji}</text>
  <text x="960" y="100" font-size="64" opacity="0.7" text-anchor="middle">${emoji}</text>
  <text x="60" y="1050" font-size="64" opacity="0.7">${emoji}</text>
  <text x="960" y="1050" font-size="64" opacity="0.7" text-anchor="middle">${emoji}</text>
  <!-- Label -->
  <text x="540" y="1040" text-anchor="middle" font-family="Georgia,serif" font-size="22"
        fill="${strokeColor}" opacity="0.5">${label} — Replace with real frame PNG</text>
</svg>`;
}

const backgrounds = [
  { file: 'floral.jpg',   label: 'Floral Elegante',      from: '#f3e0e8', to: '#c8748a', emoji: '🌸' },
  { file: 'romantic.jpg', label: 'Romantico',             from: '#ffe4e1', to: '#ff6b8a', emoji: '🌹' },
  { file: 'couple.jpg',   label: 'Mailen & Javier',       from: '#2c2c2c', to: '#4a3728', emoji: '💍' },
  { file: 'minimal.jpg',  label: 'Minimal White',         from: '#ffffff', to: '#f5f0ea', emoji: '✨' },
];

const frames = [
  { file: 'polaroid.png',      label: 'Marco Polaroid',  color: '#ffffff', emoji: '📷' },
  { file: 'floral-frame.png',  label: 'Marco Floral',    color: '#c8748a', emoji: '🌸' },
  { file: 'gold.png',          label: 'Marco Dorado',    color: '#d4a017', emoji: '✨' },
];

// Write backgrounds as SVG (renamed with .jpg extension for HTML compatibility)
backgrounds.forEach(({ file, label, from, to, emoji }) => {
  const filePath = path.join(BG_DIR, file);
  fs.writeFileSync(filePath, svgBackground(label, from, to, emoji));
  console.log('Created:', filePath);
});

// Write frames as SVG (with .png extension)
frames.forEach(({ file, label, color, emoji }) => {
  const filePath = path.join(FRAME_DIR, file);
  fs.writeFileSync(filePath, svgFrame(label, color, emoji));
  console.log('Created:', filePath);
});

console.log('\nPlaceholder assets generated successfully!');
console.log('Replace these SVG files with real JPG/PNG images before going live.');
