/**
 * canvas.js — Photo composition engine
 * Combines: photo + background + frame + text using HTML5 Canvas.
 * Uses BOOTH_CONFIG (config.js) to resolve asset paths.
 */

const CanvasEngine = (() => {
  const OUTPUT_SIZE = 1080; // Square output: 1080 × 1080 px

  // Simple cache so each image loads only once per session
  const imageCache = {};

  function loadImage(src) {
    if (!src) return Promise.resolve(null);
    if (imageCache[src]) return Promise.resolve(imageCache[src]);

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => { imageCache[src] = img; resolve(img); };
      img.onerror = () => { console.warn('[Canvas] Could not load:', src); resolve(null); };
      img.src = src;
    });
  }

  /** Cover-fit a source image into a target rectangle (like CSS object-fit: cover) */
  function drawCover(ctx, img, x, y, w, h) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = img.width  * scale;
    const sh = img.height * scale;
    const sx = x + (w - sw) / 2;
    const sy = y + (h - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh);
  }

  /** Clip context to a rounded rectangle */
  function clipRounded(ctx, x, y, w, h, r) {
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

  /** Resolve background asset path from BOOTH_CONFIG */
  function bgPath(bgId) {
    const item = BOOTH_CONFIG.backgrounds.find(b => b.id === bgId);
    return item ? item.path : null;
  }

  /** Resolve frame asset path from BOOTH_CONFIG */
  function framePath(frameId) {
    const item = BOOTH_CONFIG.frames.find(f => f.id === frameId);
    return item ? item.path : null;
  }

  /**
   * Main compose function.
   * Draws: background → user photo (or polaroid) → frame overlay → text → watermark.
   *
   * @param {HTMLCanvasElement}           outputCanvas
   * @param {HTMLImageElement|HTMLCanvasElement} photoSource
   * @param {string} bgId        — id from BOOTH_CONFIG.backgrounds
   * @param {string} frameId     — id from BOOTH_CONFIG.frames
   * @param {string} overlayText — optional guest text
   */
  async function compose(outputCanvas, photoSource, bgId, frameId, overlayText) {
    const W = OUTPUT_SIZE;
    const H = OUTPUT_SIZE;

    outputCanvas.width  = W;
    outputCanvas.height = H;

    const ctx = outputCanvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // 1. Background
    const bg = await loadImage(bgPath(bgId));
    if (bg) {
      drawCover(ctx, bg, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#F5F0EA';
      ctx.fillRect(0, 0, W, H);
    }

    // 2. User photo (special layout for polaroid frame)
    if (frameId === 'polaroid') {
      await drawPolaroid(ctx, photoSource, W, H);
    } else {
      const pad = (frameId && frameId !== 'none') ? 72 : 0;
      ctx.save();
      clipRounded(ctx, pad, pad, W - pad * 2, H - pad * 2, 12);
      drawCover(ctx, photoSource, pad, pad, W - pad * 2, H - pad * 2);
      ctx.restore();
    }

    // 3. Frame overlay (PNG with transparency, drawn on top)
    const fp = framePath(frameId);
    if (fp) {
      const frameImg = await loadImage(fp);
      if (frameImg) ctx.drawImage(frameImg, 0, 0, W, H);
    }

    // 4. Text overlay
    drawTextOverlay(ctx, overlayText, W, H);

    // 5. Watermark
    drawWatermark(ctx, W);
  }

  /** Polaroid layout: white border + photo + names at bottom */
  async function drawPolaroid(ctx, photoSource, W, H) {
    const pad    = 64;
    const bottom = 190;
    const pX = pad, pY = pad;
    const pW = W - pad * 2;
    const pH = H - pad - bottom;

    // White card with shadow
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur    = 28;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#fff';
    ctx.fillRect(pad - 12, pad - 12, W - (pad - 12) * 2, pH + bottom + 12);
    ctx.restore();

    // Photo
    ctx.save();
    clipRounded(ctx, pX, pY, pW, pH, 4);
    drawCover(ctx, photoSource, pX, pY, pW, pH);
    ctx.restore();

    // White footer
    ctx.fillStyle = '#fff';
    ctx.fillRect(pad - 12, pY + pH, W - (pad - 12) * 2, bottom + 12);

    // Names
    ctx.fillStyle = '#C89B3C';
    ctx.font = `italic bold ${Math.round(W * 0.052)}px 'Playfair Display', Georgia, serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Mailen & Javier', W / 2, pY + pH + bottom * 0.44);

    // Year
    ctx.fillStyle = '#aaa';
    ctx.font = `${Math.round(W * 0.028)}px Georgia, serif`;
    ctx.fillText('2025', W / 2, pY + pH + bottom * 0.76);
  }

  /** Semi-transparent banner + guest text at bottom of image */
  function drawTextOverlay(ctx, text, W, H) {
    if (!text || !text.trim()) return;

    const fontSize = Math.round(W * 0.044);
    const bannerH  = fontSize * 2.5;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, H - bannerH, W, bannerH);

    ctx.fillStyle    = '#fff';
    ctx.font         = `italic bold ${fontSize}px 'Playfair Display', Georgia, serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur   = 6;
    ctx.fillText(text.trim(), W / 2, H - bannerH / 2);
    ctx.restore();
  }

  /** Subtle watermark in top-right corner */
  function drawWatermark(ctx, W) {
    ctx.save();
    ctx.font         = `${Math.round(W * 0.023)}px Georgia, serif`;
    ctx.fillStyle    = 'rgba(255,255,255,0.65)';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.shadowColor  = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur   = 3;
    ctx.fillText('Mailen & Javier 2025', W - 18, 18);
    ctx.restore();
  }

  /** Convert canvas to JPEG Blob */
  function canvasToBlob(canvas, quality = 0.88) {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
  }

  /** Trigger browser download of the composed photo */
  function downloadCanvas(canvas, filename = 'wedding-photo.jpg') {
    const a = document.createElement('a');
    a.download = filename;
    a.href = canvas.toDataURL('image/jpeg', 0.88);
    a.click();
  }

  return { compose, canvasToBlob, downloadCanvas };
})();
