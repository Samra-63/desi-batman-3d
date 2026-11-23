import * as THREE from 'three';

export interface Game3DTextures {
  roadAlbedo: THREE.CanvasTexture;
  roadRoughness: THREE.CanvasTexture;
  uplayWallAlbedo: THREE.CanvasTexture;
  uplayWallBump: THREE.CanvasTexture;
  brickAlbedo: THREE.CanvasTexture;
  batmanTunic: THREE.CanvasTexture;
  supermanChest: THREE.CanvasTexture;
  dhabaSign: THREE.CanvasTexture;
  punctureSign: THREE.CanvasTexture;
  batSignalDisc: THREE.CanvasTexture;
  softGlow: THREE.CanvasTexture;
  waterRing: THREE.CanvasTexture;
  dispose: () => void;
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  maxAniso: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = maxAniso;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createGame3DTextures(maxAniso: number): Game3DTextures {
  const created: THREE.Texture[] = [];

  // 1. Rain-Slicked Wet Dirt Road Albedo + Puddle Roughness Map
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rctx = roadCanvas.getContext('2d')!;
  rctx.fillStyle = '#241e1a';
  rctx.fillRect(0, 0, 512, 512);
  // Subtle wheel ruts & wet mud grain
  for (let i = 0; i < 1800; i++) {
    const x = (i * 97) % 512;
    const y = (i * 193) % 512;
    const v = 26 + (i % 24);
    rctx.fillStyle = `rgb(${v + 8}, ${v + 2}, ${v - 2})`;
    rctx.fillRect(x, y, 4 + (i % 6), 2);
  }
  // Darker rain-soaked puddles
  const puddles = [
    { x: 110, y: 240, rx: 72, ry: 28 },
    { x: 350, y: 180, rx: 88, ry: 34 },
    { x: 240, y: 380, rx: 95, ry: 30 },
    { x: 440, y: 340, rx: 60, ry: 22 },
  ];
  for (const pd of puddles) {
    const g = rctx.createRadialGradient(pd.x, pd.y, 4, pd.x, pd.y, pd.rx);
    g.addColorStop(0, '#0f1622');
    g.addColorStop(0.75, '#171d26');
    g.addColorStop(1, 'rgba(36, 30, 26, 0)');
    rctx.fillStyle = g;
    rctx.beginPath();
    rctx.ellipse(pd.x, pd.y, pd.rx, pd.ry, 0, 0, Math.PI * 2);
    rctx.fill();
  }
  const roadAlbedo = finalizeTexture(roadCanvas, true, maxAniso, 14, 2);
  created.push(roadAlbedo);

  // Matching Roughness Map (white = rough dry mud, near-black = mirror-wet puddles!)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const rgCtx = roughCanvas.getContext('2d')!;
  rgCtx.fillStyle = '#b4b4b4';
  rgCtx.fillRect(0, 0, 512, 512);
  for (const pd of puddles) {
    const g = rgCtx.createRadialGradient(pd.x, pd.y, 6, pd.x, pd.y, pd.rx);
    g.addColorStop(0, '#141414'); // very slick mirror-wet puddle
    g.addColorStop(0.75, '#303030');
    g.addColorStop(1, '#b4b4b4');
    rgCtx.fillStyle = g;
    rgCtx.beginPath();
    rgCtx.ellipse(pd.x, pd.y, pd.rx, pd.ry, 0, 0, Math.PI * 2);
    rgCtx.fill();
  }
  const roadRoughness = finalizeTexture(roughCanvas, false, maxAniso, 14, 2);
  created.push(roadRoughness);

  // 2. Mud Wall Covered with Rows of Cow-Dung Cakes (Uplay) Albedo & Bump
  const uplayCanvas = document.createElement('canvas');
  uplayCanvas.width = 512;
  uplayCanvas.height = 256;
  const uctx = uplayCanvas.getContext('2d')!;
  uctx.fillStyle = '#4e3c2d';
  uctx.fillRect(0, 0, 512, 256);

  const uplayBumpCanvas = document.createElement('canvas');
  uplayBumpCanvas.width = 512;
  uplayBumpCanvas.height = 256;
  const ubctx = uplayBumpCanvas.getContext('2d')!;
  ubctx.fillStyle = '#505050';
  ubctx.fillRect(0, 0, 512, 256);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 9; col++) {
      const cx = col * 58 + (row % 2) * 24 + 26;
      const cy = row * 58 + 34;
      // Albedo cake
      uctx.fillStyle = '#2d2118';
      uctx.beginPath();
      uctx.arc(cx + 3, cy + 4, 21, 0, Math.PI * 2);
      uctx.fill();
      const cg = uctx.createRadialGradient(cx - 4, cy - 4, 3, cx, cy, 21);
      cg.addColorStop(0, '#725941');
      cg.addColorStop(1, '#4b3828');
      uctx.fillStyle = cg;
      uctx.beginPath();
      uctx.arc(cx, cy, 20, 0, Math.PI * 2);
      uctx.fill();
      // Handprint ridge grooves
      uctx.strokeStyle = 'rgba(26, 18, 12, 0.55)';
      uctx.lineWidth = 2;
      uctx.beginPath();
      uctx.arc(cx, cy, 12, 0.4, 2.5);
      uctx.stroke();

      // Bump height
      const bg = ubctx.createRadialGradient(cx, cy, 2, cx, cy, 20);
      bg.addColorStop(0, '#e8e8e8');
      bg.addColorStop(0.8, '#a0a0a0');
      bg.addColorStop(1, '#505050');
      ubctx.fillStyle = bg;
      ubctx.beginPath();
      ubctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ubctx.fill();
    }
  }
  const uplayWallAlbedo = finalizeTexture(uplayCanvas, true, maxAniso, 6, 1);
  const uplayWallBump = finalizeTexture(uplayBumpCanvas, false, maxAniso, 6, 1);
  created.push(uplayWallAlbedo, uplayWallBump);

  // 3. Brick Kiln Masonry Albedo
  const brickCanvas = document.createElement('canvas');
  brickCanvas.width = 256;
  brickCanvas.height = 256;
  const brCtx = brickCanvas.getContext('2d')!;
  brCtx.fillStyle = '#221512';
  brCtx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 6; c++) {
      const bx = c * 44 + (r % 2) * 22 - 12;
      const by = r * 22;
      const shade = ((r * 7 + c * 13) % 24) - 12;
      brCtx.fillStyle = `rgb(${84 + shade}, ${44 + Math.floor(shade * 0.5)}, ${34 + Math.floor(shade * 0.4)})`;
      brCtx.fillRect(bx + 2, by + 2, 40, 18);
    }
  }
  const brickAlbedo = finalizeTexture(brickCanvas, true, maxAniso, 2, 4);
  created.push(brickAlbedo);

  // 4. Desi Batman Grey Tunic with Hand-Painted Yellow Oval & Black Bat Emblem
  const batCanvas = document.createElement('canvas');
  batCanvas.width = 256;
  batCanvas.height = 256;
  const bctx = batCanvas.getContext('2d')!;
  const bgGrad = bctx.createLinearGradient(0, 0, 0, 256);
  bgGrad.addColorStop(0, '#646e7d');
  bgGrad.addColorStop(1, '#3b424f');
  bctx.fillStyle = bgGrad;
  bctx.fillRect(0, 0, 256, 256);
  // Subtle cloth weave folds
  bctx.strokeStyle = 'rgba(18, 22, 30, 0.28)';
  bctx.lineWidth = 3;
  for (let y = 20; y < 250; y += 36) {
    bctx.beginPath();
    bctx.moveTo(0, y);
    bctx.quadraticCurveTo(128, y + 10, 256, y);
    bctx.stroke();
  }
  // Yellow hand-painted oval on front face
  bctx.fillStyle = '#eab308';
  bctx.strokeStyle = '#11131a';
  bctx.lineWidth = 5;
  bctx.beginPath();
  bctx.ellipse(128, 96, 62, 36, 0, 0, Math.PI * 2);
  bctx.fill();
  bctx.stroke();
  // Black Bat emblem
  drawCanvasBat(bctx, 128, 96, 46, '#090b10');
  const batmanTunic = finalizeTexture(batCanvas, true, maxAniso);
  created.push(batmanTunic);

  // 5. Desi Superman Glowing Blue & Red-Gold Chest Texture
  const supCanvas = document.createElement('canvas');
  supCanvas.width = 256;
  supCanvas.height = 256;
  const sctx = supCanvas.getContext('2d')!;
  sctx.fillStyle = '#1d4ed8';
  sctx.fillRect(0, 0, 256, 256);
  // Torn weathered beige overshirt sides
  sctx.fillStyle = '#756653';
  sctx.fillRect(0, 0, 58, 256);
  sctx.fillRect(198, 0, 58, 256);
  // Crimson-gold diamond emblem
  sctx.fillStyle = '#dc2626';
  sctx.strokeStyle = '#facc15';
  sctx.lineWidth = 9;
  sctx.beginPath();
  sctx.moveTo(128, 46);
  sctx.lineTo(182, 96);
  sctx.lineTo(128, 168);
  sctx.lineTo(74, 96);
  sctx.closePath();
  sctx.fill();
  sctx.stroke();
  const supermanChest = finalizeTexture(supCanvas, true, maxAniso);
  created.push(supermanChest);

  // 6. Chai Ka Hotel Signboard
  const dhabaSign = createSignTexture('CHAI KA HOTEL · HATTI', '#18110e', '#f59e0b', '#fef08a', maxAniso);
  created.push(dhabaSign);

  // 7. Supresh Mangal Repairing Signboard
  const punctureSign = createSignTexture('SUPRESH MANGAL REPAIRING', '#220e0b', '#f97316', '#fed7aa', maxAniso);
  created.push(punctureSign);

  // 8. Bat-Signal Cloud Disc Texture
  const sigCanvas = document.createElement('canvas');
  sigCanvas.width = 256;
  sigCanvas.height = 256;
  const sg = sigCanvas.getContext('2d')!;
  const rad = sg.createRadialGradient(128, 128, 16, 128, 128, 124);
  rad.addColorStop(0, 'rgba(254, 243, 199, 0.92)');
  rad.addColorStop(0.6, 'rgba(245, 208, 110, 0.45)');
  rad.addColorStop(1, 'rgba(245, 208, 110, 0)');
  sg.fillStyle = rad;
  sg.fillRect(0, 0, 256, 256);
  drawCanvasBat(sg, 128, 128, 72, '#070a12');
  const batSignalDisc = finalizeTexture(sigCanvas, true, maxAniso);
  created.push(batSignalDisc);

  // 9. Soft Particle Glow Sprite
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const gctx = glowCanvas.getContext('2d')!;
  const gg = gctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  gg.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gg.addColorStop(0.45, 'rgba(255, 255, 255, 0.55)');
  gg.addColorStop(1, 'rgba(255, 255, 255, 0)');
  gctx.fillStyle = gg;
  gctx.fillRect(0, 0, 128, 128);
  const softGlow = finalizeTexture(glowCanvas, true, maxAniso);
  created.push(softGlow);

  // 10. Rain-Slicked Puddle Ripple Ring Texture
  const ringCanvas = document.createElement('canvas');
  ringCanvas.width = 128;
  ringCanvas.height = 128;
  const wrCtx = ringCanvas.getContext('2d')!;
  wrCtx.strokeStyle = 'rgba(210, 232, 255, 0.92)';
  wrCtx.lineWidth = 6;
  wrCtx.beginPath();
  wrCtx.arc(64, 64, 48, 0, Math.PI * 2);
  wrCtx.stroke();
  wrCtx.strokeStyle = 'rgba(180, 215, 255, 0.45)';
  wrCtx.lineWidth = 3;
  wrCtx.beginPath();
  wrCtx.arc(64, 64, 34, 0, Math.PI * 2);
  wrCtx.stroke();
  const waterRing = finalizeTexture(ringCanvas, true, maxAniso);
  created.push(waterRing);

  return {
    roadAlbedo,
    roadRoughness,
    uplayWallAlbedo,
    uplayWallBump,
    brickAlbedo,
    batmanTunic,
    supermanChest,
    dhabaSign,
    punctureSign,
    batSignalDisc,
    softGlow,
    waterRing,
    dispose: () => {
      for (const t of created) t.dispose();
    },
  };
}

function createSignTexture(
  label: string,
  bg: string,
  border: string,
  textCol: string,
  maxAniso: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = border;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 88);
  ctx.fillStyle = textCol;
  ctx.font = '900 40px "Big Shoulders Display", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 256, 50);
  return finalizeTexture(canvas, true, maxAniso);
}

function drawCanvasBat(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.44);
  ctx.lineTo(r * 0.16, -r * 0.22);
  ctx.lineTo(r * 0.36, -r * 0.44);
  ctx.quadraticCurveTo(r * 0.85, -r * 0.35, r * 1.15, -r * 0.05);
  ctx.quadraticCurveTo(r * 0.72, r * 0.08, r * 0.56, r * 0.32);
  ctx.quadraticCurveTo(r * 0.28, r * 0.15, 0, r * 0.48);
  ctx.quadraticCurveTo(-r * 0.28, r * 0.15, -r * 0.56, r * 0.32);
  ctx.quadraticCurveTo(-r * 0.72, r * 0.08, -r * 1.15, -r * 0.05);
  ctx.quadraticCurveTo(-r * 0.85, -r * 0.35, -r * 0.36, -r * 0.44);
  ctx.lineTo(-r * 0.16, -r * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function createComicTextSpriteTexture(text: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '900 66px "Big Shoulders Display", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 11;
  ctx.strokeStyle = '#06080f';
  ctx.strokeText(text, 256, 66);
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
