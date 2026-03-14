// ---------------------------------------------------------------
// Wedding Photo Booth — Asset Configuration
// ---------------------------------------------------------------
//
// HOW TO ADD A NEW BACKGROUND:
//   1. Copy your image to:  assets/backgrounds/yourimage.jpg
//   2. Add one entry below in the `backgrounds` array
//   3. Restart the server — it appears automatically in the app
//
// HOW TO ADD A NEW FRAME:
//   1. Copy your PNG (must have transparency) to: assets/frames/yourframe.png
//   2. Add one entry below in the `frames` array
//   3. Done — no other files need touching
//
// FIELDS:
//   id    — unique key used internally (no spaces)
//   label — text shown to guests below the thumbnail
//   path  — full path to the image file served by Express
//   thumb — thumbnail path (can be same as path, or a smaller version)
// ---------------------------------------------------------------

const BOOTH_CONFIG = {

  backgrounds: [
    {
      id:    'none',
      label: 'Sin fondo',
      path:  null,
      thumb: null,
    },
    {
      id:    'floral',
      label: 'Floral',
      path:  'assets/backgrounds/floral.jpg',
      thumb: 'assets/backgrounds/floral.jpg',
    },
    {
      id:    'romantic',
      label: 'Romántico',
      path:  'assets/backgrounds/romantic.jpg',
      thumb: 'assets/backgrounds/romantic.jpg',
    },
    {
      id:    'couple',
      label: 'M & J',
      path:  'assets/backgrounds/couple.jpg',
      thumb: 'assets/backgrounds/couple.jpg',
    },
    {
      id:    'minimal',
      label: 'Minimal',
      path:  'assets/backgrounds/minimal.jpg',
      thumb: 'assets/backgrounds/minimal.jpg',
    },
  ],

  frames: [
    {
      id:    'none',
      label: 'Sin marco',
      path:  null,
      thumb: null,
    },
    {
      id:    'polaroid',
      label: 'Polaroid',
      path:  'assets/frames/polaroid.png',
      thumb: 'assets/frames/polaroid.png',
    },
    {
      id:    'floral-frame',
      label: 'Floral',
      path:  'assets/frames/floral-frame.png',
      thumb: 'assets/frames/floral-frame.png',
    },
    {
      id:    'gold',
      label: 'Dorado',
      path:  'assets/frames/gold.png',
      thumb: 'assets/frames/gold.png',
    },
  ],
};
