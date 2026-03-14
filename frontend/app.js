/**
 * app.js — Wedding Photo Booth
 * Screen navigation, camera, file input, canvas composition, upload
 */

// ---- Application state ----
const state = {
  photoSource:   null,    // HTMLImageElement with the guest's photo
  selectedBg:    'none',
  selectedFrame: 'none',
  overlayText:   '',
  stream:        null,
  facingMode:    'user',
};

// ---- DOM references ----
const screens = {
  welcome: document.getElementById('screen-welcome'),
  camera:  document.getElementById('screen-camera'),
  edit:    document.getElementById('screen-edit'),
  preview: document.getElementById('screen-preview'),
};

const videoEl           = document.getElementById('video-preview');
const canvasCapture     = document.getElementById('canvas-capture');
const canvasFinal       = document.getElementById('canvas-final');
const canvasPreviewFinal= document.getElementById('canvas-preview-final');
const fileInput         = document.getElementById('file-input');
const overlayTextInput  = document.getElementById('overlay-text');
const uploadStatus      = document.getElementById('upload-status');
const uploadBtnText     = document.getElementById('upload-btn-text');
const uploadSpinner     = document.getElementById('upload-spinner');

// =========================================================
// OPTION CARDS — built from BOOTH_CONFIG (config.js)
// =========================================================

/**
 * Build option card elements for backgrounds or frames.
 * @param {string} containerId  — DOM id of the parent row
 * @param {Array}  items        — BOOTH_CONFIG.backgrounds or .frames
 * @param {string} stateKey     — 'selectedBg' or 'selectedFrame'
 * @param {Function} onChange   — called after selection changes
 */
function buildOptionCards(containerId, items, stateKey, onChange) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'option-card' + (index === 0 ? ' selected' : '');
    card.dataset.id = item.id;
    card.setAttribute('role', 'option');
    card.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    card.setAttribute('aria-label', item.label);

    // Thumbnail
    if (item.thumb) {
      const img = document.createElement('img');
      img.className = 'option-thumb';
      img.src = item.thumb;
      img.alt = item.label;
      img.loading = 'lazy';
      img.draggable = false;
      card.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'option-thumb-none';
      placeholder.textContent = '✕';
      card.appendChild(placeholder);
    }

    const label = document.createElement('span');
    label.textContent = item.label;
    card.appendChild(label);

    card.addEventListener('click', () => {
      // Deselect all
      container.querySelectorAll('.option-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-selected', 'false');
      });
      // Select this
      card.classList.add('selected');
      card.setAttribute('aria-selected', 'true');
      state[stateKey] = item.id;
      onChange();
    });

    container.appendChild(card);
  });
}

// =========================================================
// SCREEN NAVIGATION
// =========================================================
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (key === name) {
      el.classList.remove('slide-out');
      el.classList.add('active');
      el.scrollTop = 0;
    } else if (el.classList.contains('active')) {
      el.classList.remove('active');
      el.classList.add('slide-out');
      setTimeout(() => el.classList.remove('slide-out'), 380);
    }
  });
}

// =========================================================
// CAMERA
// =========================================================
async function startCamera(facingMode = 'user') {
  stopCamera();
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    videoEl.srcObject = state.stream;
    state.facingMode = facingMode;
  } catch (err) {
    alert('No se pudo acceder a la cámara. Verifica los permisos.\n' + err.message);
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
    videoEl.srcObject = null;
  }
}

async function capturePhoto() {
  const vw = videoEl.videoWidth  || 640;
  const vh = videoEl.videoHeight || 480;
  canvasCapture.width  = vw;
  canvasCapture.height = vh;
  const ctx = canvasCapture.getContext('2d');

  // Mirror front camera
  if (state.facingMode === 'user') {
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(videoEl, 0, 0, vw, vh);
  return canvasToImage(canvasCapture);
}

function canvasToImage(canvas) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = canvas.toDataURL('image/jpeg', 0.92);
  });
}

// =========================================================
// FILE UPLOAD
// =========================================================
function loadFileAsImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen.'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('La imagen supera 10MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// =========================================================
// CANVAS COMPOSITION
// =========================================================
async function renderEditPreview() {
  if (!state.photoSource) return;
  try {
    await CanvasEngine.compose(
      canvasFinal,
      state.photoSource,
      state.selectedBg,
      state.selectedFrame,
      state.overlayText
    );
  } catch (e) {
    console.error('Render error:', e);
  }
}

async function renderFinalPreview() {
  if (!state.photoSource) return;
  await CanvasEngine.compose(
    canvasPreviewFinal,
    state.photoSource,
    state.selectedBg,
    state.selectedFrame,
    state.overlayText
  );
}

// =========================================================
// UPLOAD TO GOOGLE DRIVE (via backend)
// =========================================================
async function uploadToGoogleDrive() {
  uploadBtnText.textContent = 'Subiendo…';
  uploadSpinner.style.display = 'inline-block';
  uploadStatus.textContent = '';
  uploadStatus.className = 'upload-status';

  try {
    const blob = await CanvasEngine.canvasToBlob(canvasPreviewFinal, 0.88);
    const formData = new FormData();
    formData.append('photo', blob, `wedding-photo-${Date.now()}.jpg`);

    const res = await fetch('/upload-photo', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al subir la foto');

    uploadStatus.textContent = '¡Foto subida con éxito! Gracias por compartir tu momento. 💕';
    uploadStatus.className = 'upload-status success';
    uploadBtnText.textContent = '✓ Subida con éxito';

  } catch (err) {
    console.error(err);
    uploadStatus.textContent = 'No se pudo subir la foto: ' + err.message;
    uploadStatus.className = 'upload-status error';
    uploadBtnText.textContent = '☁ Subir a Google Drive';
  } finally {
    uploadSpinner.style.display = 'none';
  }
}

// =========================================================
// RESET STATE
// =========================================================
function resetApp() {
  state.photoSource   = null;
  state.selectedBg    = 'none';
  state.selectedFrame = 'none';
  state.overlayText   = '';
  overlayTextInput.value = '';

  // Re-select first card in each group
  ['bg-options', 'frame-options'].forEach(id => {
    const first = document.querySelector(`#${id} .option-card`);
    document.querySelectorAll(`#${id} .option-card`).forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-selected', 'false');
    });
    if (first) {
      first.classList.add('selected');
      first.setAttribute('aria-selected', 'true');
    }
  });

  // Reset upload button
  uploadBtnText.textContent = '☁ Subir a Google Drive';
  uploadStatus.textContent  = '';
  uploadStatus.className    = 'upload-status';
}

// =========================================================
// EVENT LISTENERS
// =========================================================

// Welcome: take photo
document.getElementById('btn-take-photo').addEventListener('click', async () => {
  showScreen('camera');
  await startCamera(state.facingMode);
});

// Welcome: upload from gallery
document.getElementById('btn-upload-photo').addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    state.photoSource = await loadFileAsImage(file);
    showScreen('edit');
    await renderEditPreview();
  } catch (err) {
    alert(err.message);
  }
  fileInput.value = '';
});

// Camera: back
document.getElementById('btn-back-camera').addEventListener('click', () => {
  stopCamera();
  showScreen('welcome');
});

// Camera: flip
document.getElementById('btn-flip-camera').addEventListener('click', () => {
  startCamera(state.facingMode === 'user' ? 'environment' : 'user');
});

// Camera: shutter
document.getElementById('btn-shutter').addEventListener('click', async () => {
  state.photoSource = await capturePhoto();
  stopCamera();
  showScreen('edit');
  await renderEditPreview();
});

// Edit: back
document.getElementById('btn-back-edit').addEventListener('click', () => {
  showScreen('welcome');
});

// Edit: text overlay (debounced)
let textDebounce;
overlayTextInput.addEventListener('input', () => {
  state.overlayText = overlayTextInput.value;
  clearTimeout(textDebounce);
  textDebounce = setTimeout(renderEditPreview, 420);
});

// Edit: go to preview
document.getElementById('btn-preview').addEventListener('click', async () => {
  showScreen('preview');
  uploadStatus.textContent = '';
  uploadStatus.className   = 'upload-status';
  uploadBtnText.textContent = '☁ Subir a Google Drive';
  await renderFinalPreview();
});

// Preview: back
document.getElementById('btn-back-preview').addEventListener('click', () => {
  showScreen('edit');
});

// Preview: upload to Drive
document.getElementById('btn-upload-drive').addEventListener('click', uploadToGoogleDrive);

// Preview: save locally
document.getElementById('btn-download').addEventListener('click', () => {
  CanvasEngine.downloadCanvas(canvasPreviewFinal, `wedding-photo-${Date.now()}.jpg`);
});

// Preview: start over
document.getElementById('btn-restart').addEventListener('click', () => {
  resetApp();
  showScreen('welcome');
});

// =========================================================
// INIT — build option cards from config and show welcome
// =========================================================
buildOptionCards('bg-options',    BOOTH_CONFIG.backgrounds, 'selectedBg',    renderEditPreview);
buildOptionCards('frame-options', BOOTH_CONFIG.frames,      'selectedFrame',  renderEditPreview);
showScreen('welcome');
