/**
 * generate-qr.js
 * Generates a QR code pointing to the deployed app URL.
 * Usage: node scripts/generate-qr.js https://your-deployed-url.com
 *
 * Install dependency first: npm install qrcode
 */

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const url = process.argv[2];

if (!url) {
  console.error('Usage: node scripts/generate-qr.js <URL>');
  console.error('Example: node scripts/generate-qr.js https://casamientomayyjavi.vercel.app');
  process.exit(1);
}

const outputDir = path.join(__dirname, '..', 'assets');
const pngPath = path.join(outputDir, 'qr-code.png');
const svgPath = path.join(outputDir, 'qr-code.svg');

async function generate() {
  // PNG — for printing
  await QRCode.toFile(pngPath, url, {
    type: 'png',
    width: 1200,
    margin: 2,
    color: {
      dark: '#b8860b',   // Gold QR modules
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  // SVG — for vector printing
  await QRCode.toFile(svgPath, url, {
    type: 'svg',
    width: 1200,
    margin: 2,
    color: {
      dark: '#b8860b',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  // Terminal preview
  const terminalQR = await QRCode.toString(url, {
    type: 'terminal',
    small: true,
  });

  console.log('\nQR Code generated for:', url);
  console.log('PNG saved to:', pngPath);
  console.log('SVG saved to:', svgPath);
  console.log('\nTerminal preview:\n');
  console.log(terminalQR);
  console.log('\nPrint the PNG or SVG for the wedding table card!');
}

generate().catch(console.error);
