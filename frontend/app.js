/**
 * app.js — Main application logic
 * Handles screen navigation, camera, file input, and photo upload
 */

// ---- State ----
const state = {
  photoSource: null,   // HTMLImageElement or canvas with user photo
  selectedBg: 'none',
  selectedFrame: 'none',
  overlayText: '',
  stream: null,
  facingMode: 'user',
};

// ---- DOM References ----
const screens = {
  welcome: document.getElementById('screen-welcome'),
  camera: document.getElementById('screen-camera'),
  edit: document.getElementById('screen-edit'),
  preview: document.getElementById('screen-preview'),
};

const videoEl = document.getElementById('video-preview');
const canvasCapture = document.getElementById('canvas-capture');
const canvasFinal = document.getElementById('canvas-final');
const canvasPreviewFinal = document.getElementById('canvas-preview-final');
const fileInput = document.getElementById('file-input');
const overlayTextInput = document.getElementById('overlay-text');
const uploadStatus = document.getElementById('upload-status');
const uploadBtnText = document.getElementById('upload-btn-text');
const uploadSpinner = document.getElementById('upload-spinner');

// ---- Screen Navigation ----
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (key === name) {
      el.classList.remove('slide-out');
      el.classList.add('active');
      el.scrollTop = 0;
    } else if (el.classList.contains('active')) {
      el.classList.remove('active');
      el.classList.add('slide-out');
      setTimeout(() => el.classList.remove('slide-out'), 400);
    }
  });
}

// ---- Camera ----
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
  }
}

function capturePhoto() {
  const vw = videoEl.videoWidth || 640;
  const vh = videoEl.videoHeight || 480;
  canvasCapture.width = vw;
  canvasCapture.height = vh;
  const ctx = canvasCapture.getContext('2d');

  // Mirror if front camera
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

// ---- File upload ----
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

// ---- Compose & render ----
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

// ---- Option selectors ----
function setupOptionCards(containerId, stateKey, onChange) {
  const container = document.getElementById(containerId);
  container.addEventListener('click', (e) => {
    const card = e.target.closest('.option-card');
    if (!card) return;
    container.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state[stateKey] = card.dataset[stateKey === 'selectedBg' ? 'bg' : 'frame'];
    onChange();
  });
}

// ---- Upload to backend ----
async function uploadToGoogleDrive() {
  uploadBtnText.textContent = 'Subiendo...';
  uploadSpinner.style.display = 'inline-block';
  uploadStatus.textContent = '';
  uploadStatus.className = 'upload-status';

  try {
    const blob = await CanvasEngine.canvasToBlob(canvasPreviewFinal, 0.88);
    const formData = new FormData();
    formData.append('photo', blob, `wedding-photo-${Date.now()}.jpg`);

    // Backend URL — change to your deployed URL in production
    const backendUrl = window.BACKEND_URL || '/upload-photo';

    const res = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error al subir la foto');

    uploadStatus.textContent = '¡Foto subida con exito! Gracias por compartir tu momento. 💕';
    uploadStatus.className = 'upload-status success';
    uploadBtnText.textContent = '✓ Subida con exito';
  } catch (err) {
    console.error(err);
    uploadStatus.textContent = 'No se pudo subir la foto: ' + err.message;
    uploadStatus.className = 'upload-status error';
    uploadBtnText.textContent = '↑ Subir a Google Drive';
  } finally {
    uploadSpinner.style.display = 'none';
  }
}

// ---- Event Listeners ----

// Welcome: Take photo
document.getElementById('btn-take-photo').addEventListener('click', async () => {
  showScreen('camera');
  await startCamera(state.facingMode);
});

// Welcome: Upload photo
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

// Camera: Back
document.getElementById('btn-back-camera').addEventListener('click', () => {
  stopCamera();
  showScreen('welcome');
});

// Camera: Flip
document.getElementById('btn-flip-camera').addEventListener('click', () => {
  const next = state.facingMode === 'user' ? 'environment' : 'user';
  startCamera(next);
});

// Camera: Shutter
document.getElementById('btn-shutter').addEventListener('click', async () => {
  state.photoSource = await capturePhoto();
  stopCamera();
  showScreen('edit');
  await renderEditPreview();
});

// Edit: Back
document.getElementById('btn-back-edit').addEventListener('click', () => {
  showScreen('welcome');
});

// Edit: Option cards
setupOptionCards('bg-options', 'selectedBg', renderEditPreview);
setupOptionCards('frame-options', 'selectedFrame', renderEditPreview);

// Edit: Text overlay
let textDebounce;
overlayTextInput.addEventListener('input', () => {
  state.overlayText = overlayTextInput.value;
  clearTimeout(textDebounce);
  textDebounce = setTimeout(renderEditPreview, 400);
});

// Edit: Preview button
document.getElementById('btn-preview').addEventListener('click', async () => {
  showScreen('preview');
  uploadStatus.textContent = '';
  uploadStatus.className = 'upload-status';
  uploadBtnText.textContent = '↑ Subir a Google Drive';
  await renderFinalPreview();
});

// Preview: Back
document.getElementById('btn-back-preview').addEventListener('click', () => {
  showScreen('edit');
});

// Preview: Upload to Drive
document.getElementById('btn-upload-drive').addEventListener('click', uploadToGoogleDrive);

// Preview: Download locally
document.getElementById('btn-download').addEventListener('click', () => {
  CanvasEngine.downloadCanvas(canvasPreviewFinal, `wedding-photo-${Date.now()}.jpg`);
});

// Preview: Restart
document.getElementById('btn-restart').addEventListener('click', () => {
  state.photoSource = null;
  state.selectedBg = 'none';
  state.selectedFrame = 'none';
  state.overlayText = '';
  overlayTextInput.value = '';

  // Reset option selections
  document.querySelectorAll('#bg-options .option-card').forEach((c, i) => {
    c.classList.toggle('selected', i === 0);
  });
  document.querySelectorAll('#frame-options .option-card').forEach((c, i) => {
    c.classList.toggle('selected', i === 0);
  });

  showScreen('welcome');
});

// ---- Init ----
showScreen('welcome');
