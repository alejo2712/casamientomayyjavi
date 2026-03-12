/**
 * canvas.js — Photo composition engine
 * Combines: photo + background + frame + text overlay using HTML5 Canvas
 */

const CanvasEngine = (() => {
  const OUTPUT_W = 1080;
  const OUTPUT_H = 1080;

  const imageCache = {};

  function loadImage(src) {
    if (imageCache[src]) return Promise.resolve(imageCache[src]);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCache[src] = img;
        resolve(img);
      };
      img.onerror = () => {
        // Resolve null so missing assets don't crash the app
        console.warn('Could not load image:', src);
        resolve(null);
      };
      img.src = src;
    });
  }

  /**
   * Draw the photo centered and cover-fitted into the canvas
   */
  function drawPhotoContain(ctx, photo, x, y, w, h) {
    const scale = Math.max(w / photo.width, h / photo.height);
    const sw = photo.width * scale;
    const sh = photo.height * scale;
    const sx = x + (w - sw) / 2;
    const sy = y + (h - sh) / 2;
    ctx.drawImage(photo, sx, sy, sw, sh);
  }

  /**
   * Clip to a rounded rectangle
   */
  function clipRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.clip();
  }

  /**
   * Draw text overlay at the bottom of the canvas
   */
  function drawTextOverlay(ctx, text, canvasW, canvasH) {
    if (!text || !text.trim()) return;

    const fontSize = Math.round(canvasW * 0.045);
    ctx.save();

    // Semi-transparent banner
    const bannerH = fontSize * 2.4;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, canvasH - bannerH, canvasW, bannerH);

    ctx.fillStyle = '#fff';
    ctx.font = `italic bold ${fontSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(text, canvasW / 2, canvasH - bannerH / 2);

    ctx.restore();
  }

  /**
   * Draw wedding watermark
   */
  function drawWatermark(ctx, canvasW) {
    ctx.save();
    ctx.font = `${Math.round(canvasW * 0.025)}px Georgia, serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('Mailen & Javier 2025', canvasW - 16, 16);
    ctx.restore();
  }

  /**
   * Main compose function
   * @param {HTMLCanvasElement} outputCanvas
   * @param {HTMLImageElement|HTMLCanvasElement} photoSource
   * @param {string|null} bgKey  - 'floral' | 'romantic' | 'couple' | 'minimal' | 'none'
   * @param {string|null} frameKey - 'polaroid' | 'floral-frame' | 'gold' | 'none'
   * @param {string} overlayText
   */
  async function compose(outputCanvas, photoSource, bgKey, frameKey, overlayText) {
    const W = OUTPUT_W;
    const H = OUTPUT_H;
    outputCanvas.width = W;
    outputCanvas.height = H;

    const ctx = outputCanvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // 1. Draw background
    if (bgKey && bgKey !== 'none') {
      const bgImg = await loadImage(`assets/backgrounds/${bgKey}.jpg`);
      if (bgImg) {
        drawPhotoContain(ctx, bgImg, 0, 0, W, H);
      } else {
        ctx.fillStyle = '#f5f0ea';
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      ctx.fillStyle = '#f5f0ea';
      ctx.fillRect(0, 0, W, H);
    }

    // 2. Draw user photo based on frame type
    if (frameKey === 'polaroid') {
      await drawPolaroid(ctx, photoSource, W, H);
    } else {
      // Default: photo with padding
      const pad = frameKey && frameKey !== 'none' ? 80 : 0;
      ctx.save();
      clipRoundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 16);
      drawPhotoContain(ctx, photoSource, pad, pad, W - pad * 2, H - pad * 2);
      ctx.restore();
    }

    // 3. Draw frame overlay on top
    if (frameKey && frameKey !== 'none') {
      let frameSrc;
      if (frameKey === 'polaroid') frameSrc = 'assets/frames/polaroid.png';
      else if (frameKey === 'floral-frame') frameSrc = 'assets/frames/floral-frame.png';
      else if (frameKey === 'gold') frameSrc = 'assets/frames/gold.png';

      if (frameSrc) {
        const frameImg = await loadImage(frameSrc);
        if (frameImg) {
          ctx.drawImage(frameImg, 0, 0, W, H);
        }
      }
    }

    // 4. Draw text overlay
    drawTextOverlay(ctx, overlayText, W, H);

    // 5. Watermark
    drawWatermark(ctx, W);
  }

  /**
   * Special polaroid layout
   */
  async function drawPolaroid(ctx, photoSource, W, H) {
    const pad = 60;
    const bottomSpace = 180;
    const photoX = pad;
    const photoY = pad;
    const photoW = W - pad * 2;
    const photoH = H - pad - bottomSpace;

    // White polaroid background
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
    ctx.fillRect(pad - 10, pad - 10, W - (pad - 10) * 2, H - (pad - 10) - bottomSpace + 180);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.save();
    clipRoundRect(ctx, photoX, photoY, photoW, photoH, 4);
    drawPhotoContain(ctx, photoSource, photoX, photoY, photoW, photoH);
    ctx.restore();

    // Polaroid text area
    ctx.fillStyle = '#fff';
    ctx.fillRect(pad - 10, photoY + photoH, W - (pad - 10) * 2, bottomSpace);

    ctx.fillStyle = '#b8860b';
    ctx.font = `italic bold ${Math.round(W * 0.055)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Mailen & Javier', W / 2, photoY + photoH + bottomSpace * 0.45);

    ctx.fillStyle = '#888';
    ctx.font = `${Math.round(W * 0.03)}px Georgia, serif`;
    ctx.fillText('2025', W / 2, photoY + photoH + bottomSpace * 0.75);
  }

  /**
   * Convert a canvas to a Blob (JPEG)
   */
  function canvasToBlob(canvas, quality = 0.88) {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
  }

  /**
   * Download canvas as image
   */
  function downloadCanvas(canvas, filename = 'wedding-photo.jpg') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/jpeg', 0.88);
    link.click();
  }

  return { compose, canvasToBlob, downloadCanvas };
})();
