import * as THREE from 'three';
import { WORLD_SCALE } from './models3d';
import { createComicTextSpriteTexture, type Game3DTextures } from './textures3d';
import type { Particle, SmokeCloud, WorldTheme } from './types';

interface RainSplashRipple {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
  maxScale: number;
}

interface DropletBounce {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface CombatBillboard {
  sprite: THREE.Sprite;
  life: number;
  maxLife: number;
  vy: number;
}

/**
 * Dynamic 3D Rain-Slicked Weather, Localized Splash Particle & Intermittent Lightning System.
 * Illuminates both comic-style foreground framing elements and deep background Gaon layers.
 */
export class Weather3DSystem {
  public readonly group = new THREE.Group();

  // 1. Slanted 3D Rain Sheets across Foreground (+Z), Combat Lane (0), and Background (-Z)
  private rainCount = 460;
  private rainPositions: Float32Array;
  private rainSpeeds: Float32Array;
  private rainGeo: THREE.BufferGeometry;
  private rainMat: THREE.LineBasicMaterial;
  private rainLines: THREE.LineSegments;

  // 2. Localized Rain-Slicked Road Puddle & Rooftop Ripple Rings
  private ripples: RainSplashRipple[] = [];
  private rippleSpawnTimer = 0;
  private rippleGeo: THREE.PlaneGeometry;
  private rippleMat: THREE.MeshBasicMaterial;

  // 3. Localized Raindrop Bounces & Footstep/Hoof Water Spray (Points)
  private maxDrops = 160;
  private drops: DropletBounce[] = [];
  private dropPos: Float32Array;
  private dropGeo: THREE.BufferGeometry;
  private dropMat: THREE.PointsMaterial;
  private dropPoints: THREE.Points;

  // 4. Rising Inferno Embers (for Ch4 Puncture Inferno & Ch5 Eent Bhatta)
  private emberCount = 85;
  private emberPos: Float32Array;
  private emberGeo: THREE.BufferGeometry;
  private emberMat: THREE.PointsMaterial;
  private emberPoints: THREE.Points;

  // 5. Forked 3D Lightning Bolt Mesh + Dynamic Foreground/Background Flash Light
  public readonly lightningDirLight: THREE.DirectionalLight;
  public readonly lightningRimLight: THREE.PointLight;
  private boltLine: THREE.Line;
  private boltGeo: THREE.BufferGeometry;
  private boltMat: THREE.LineBasicMaterial;
  private boltGlowLine: THREE.Line;
  private boltGlowMat: THREE.LineBasicMaterial;
  private lastFlashActive = false;

  // 6. Combat VFX Particle Pool (Sparks, Dust, Fire, Water, Steam, Rings) & Comic Text Billboards
  private maxVfx = 220;
  private vfxPos: Float32Array;
  private vfxCol: Float32Array;
  private vfxGeo: THREE.BufferGeometry;
  private vfxPoints: THREE.Points;
  private smokeMeshes = new Map<string, THREE.Group>();
  private textBillboards: CombatBillboard[] = [];
  private textTextureCache = new Map<string, THREE.CanvasTexture>();
  private softGlow: THREE.CanvasTexture;
  private tempColor = new THREE.Color();

  constructor(textures: Game3DTextures) {
    this.softGlow = textures.softGlow;

    // --- 1. 3D Volumetric Slanted Rain Streaks ---
    this.rainPositions = new Float32Array(this.rainCount * 6);
    this.rainSpeeds = new Float32Array(this.rainCount);
    for (let i = 0; i < this.rainCount; i++) {
      const rx = (Math.random() - 0.5) * 44;
      const ry = Math.random() * 19;
      // Distributed across foreground (+2..+7.5), combat lane (-2..+2), and background (-16..-2)
      const rz = -15 + Math.random() * 22.5;
      this.rainSpeeds[i] = 17 + Math.random() * 9;
      this.writeRainStreak(i, rx, ry, rz);
    }
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xbcd8ff,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(this.rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.group.add(this.rainLines);

    // --- 2. Localized Wet Road / Rooftop Splash Ripples ---
    this.rippleGeo = new THREE.PlaneGeometry(1, 1);
    this.rippleGeo.rotateX(-Math.PI * 0.5);
    this.rippleMat = new THREE.MeshBasicMaterial({
      map: textures.waterRing,
      color: 0xcbe4ff,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    // --- 3. Localized Rain-Slicked Droplet Spray ---
    this.dropPos = new Float32Array(this.maxDrops * 3);
    this.dropGeo = new THREE.BufferGeometry();
    this.dropGeo.setAttribute('position', new THREE.BufferAttribute(this.dropPos, 3));
    this.dropMat = new THREE.PointsMaterial({
      map: textures.softGlow,
      color: 0xdbeafe,
      size: 0.24,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.dropPoints = new THREE.Points(this.dropGeo, this.dropMat);
    this.dropPoints.frustumCulled = false;
    this.group.add(this.dropPoints);

    // --- 4. Embers for Inferno & Brick Kiln ---
    this.emberPos = new Float32Array(this.emberCount * 3);
    for (let i = 0; i < this.emberCount; i++) {
      this.emberPos[i * 3] = (Math.random() - 0.5) * 38;
      this.emberPos[i * 3 + 1] = Math.random() * 14;
      this.emberPos[i * 3 + 2] = -8 + Math.random() * 14;
    }
    this.emberGeo = new THREE.BufferGeometry();
    this.emberGeo.setAttribute('position', new THREE.BufferAttribute(this.emberPos, 3));
    this.emberMat = new THREE.PointsMaterial({
      map: textures.softGlow,
      color: 0xfb923c,
      size: 0.28,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.emberPoints = new THREE.Points(this.emberGeo, this.emberMat);
    this.emberPoints.frustumCulled = false;
    this.emberPoints.visible = false;
    this.group.add(this.emberPoints);

    // --- 5. Intermittent Lightning Lights & Forked 3D Sky Bolt ---
    this.lightningDirLight = new THREE.DirectionalLight(0xcde4ff, 0);
    this.lightningDirLight.position.set(10, 26, 14);
    this.group.add(this.lightningDirLight, this.lightningDirLight.target);

    this.lightningRimLight = new THREE.PointLight(0x93c5fd, 0, 68, 1.3);
    this.lightningRimLight.position.set(0, 12, -14);
    this.group.add(this.lightningRimLight);

    this.boltGeo = new THREE.BufferGeometry();
    this.boltGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 3), 3));
    this.boltMat = new THREE.LineBasicMaterial({
      color: 0xf0f7ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.boltGlowMat = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.boltLine = new THREE.Line(this.boltGeo, this.boltMat);
    this.boltLine.frustumCulled = false;
    this.boltGlowLine = new THREE.Line(this.boltGeo, this.boltGlowMat);
    this.boltGlowLine.frustumCulled = false;
    this.boltGlowLine.position.z = -0.15;
    this.group.add(this.boltLine, this.boltGlowLine);

    // --- 6. Dynamic Combat Particle Points ---
    this.vfxPos = new Float32Array(this.maxVfx * 3);
    this.vfxCol = new Float32Array(this.maxVfx * 3);
    this.vfxGeo = new THREE.BufferGeometry();
    this.vfxGeo.setAttribute('position', new THREE.BufferAttribute(this.vfxPos, 3));
    this.vfxGeo.setAttribute('color', new THREE.BufferAttribute(this.vfxCol, 3));
    const vfxMat = new THREE.PointsMaterial({
      map: textures.softGlow,
      size: 0.42,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.vfxPoints = new THREE.Points(this.vfxGeo, vfxMat);
    this.vfxPoints.frustumCulled = false;
    this.group.add(this.vfxPoints);
  }

  private writeRainStreak(idx: number, x: number, y: number, z: number): void {
    const o = idx * 6;
    const streakLen = 0.72;
    const slantX = -0.18;
    this.rainPositions[o] = x;
    this.rainPositions[o + 1] = y;
    this.rainPositions[o + 2] = z;
    this.rainPositions[o + 3] = x + slantX;
    this.rainPositions[o + 4] = y - streakLen;
    this.rainPositions[o + 5] = z;
  }

  public spawnLocalizedSplash(worldX: number, worldY: number, worldZ = 0, count = 6): void {
    // Expanding water puddle ring at impact/step location
    if (this.ripples.length < 32) {
      const m = new THREE.Mesh(this.rippleGeo, this.rippleMat.clone());
      m.position.set(worldX, Math.max(0.03, worldY + 0.03), worldZ);
      m.scale.setScalar(0.18);
      this.group.add(m);
      this.ripples.push({ mesh: m, age: 0, maxAge: 0.55, maxScale: 0.85 + Math.random() * 0.5 });
    }
    // Upward micro rain-slicked spray droplets
    for (let i = 0; i < count; i++) {
      if (this.drops.length >= this.maxDrops) break;
      this.drops.push({
        x: worldX + (Math.random() - 0.5) * 0.45,
        y: Math.max(0.05, worldY + 0.05),
        z: worldZ + (Math.random() - 0.5) * 0.45,
        vx: (Math.random() - 0.5) * 2.8,
        vy: 1.8 + Math.random() * 2.6,
        vz: (Math.random() - 0.5) * 2.2,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
      });
    }
  }

  public spawnComicBillboard(worldX: number, worldY: number, text: string, color: string): void {
    const key = `${text}|${color}`;
    let tex = this.textTextureCache.get(key);
    if (!tex) {
      tex = createComicTextSpriteTexture(text, color);
      this.textTextureCache.set(key, tex);
    }
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(worldX, worldY, 1.35);
    sprite.scale.set(3.4, 0.86, 1);
    sprite.renderOrder = 20;
    this.group.add(sprite);
    this.textBillboards.push({ sprite, life: 0.95, maxLife: 0.95, vy: 1.15 });
  }

  private regenerateLightningBolt(centerX: number): void {
    const attr = this.boltGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const startX = centerX + (Math.random() - 0.5) * 18;
    const z = -15 - Math.random() * 6;
    let cx = startX;
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const y = 24 - t * 18;
      if (i > 0) cx += (Math.random() - 0.5) * 2.6;
      arr[i * 3] = cx;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    attr.needsUpdate = true;
    this.lightningRimLight.position.set(startX, 11, z + 3);
    this.lightningDirLight.position.set(startX + 4, 26, 14);
    this.lightningDirLight.target.position.set(centerX, 0, 0);
    this.lightningDirLight.target.updateMatrixWorld();
  }

  public update(
    dt: number,
    time: number,
    cameraWorldX: number,
    theme: WorldTheme,
    lightningFlash: number,
    particles: Particle[],
    smokeClouds: SmokeCloud[]
  ): void {
    // 1. Update 3D Slanted Rain Streaks centered around cameraWorldX
    const windGust = Math.sin(time * 0.9) * 2.2 - 3.2;
    for (let i = 0; i < this.rainCount; i++) {
      const o = i * 6;
      let rx = this.rainPositions[o] + windGust * dt;
      let ry = this.rainPositions[o + 1] - this.rainSpeeds[i] * dt;
      const rz = this.rainPositions[o + 2];

      if (ry < 0.05) {
        ry = 16 + Math.random() * 5;
        rx = cameraWorldX + (Math.random() - 0.5) * 44;
      }
      if (rx < cameraWorldX - 24) rx += 48;
      else if (rx > cameraWorldX + 24) rx -= 48;

      this.writeRainStreak(i, rx, ry, rz);
    }
    this.rainGeo.attributes.position.needsUpdate = true;

    // Brighten foreground & background rain glint dramatically during lightning flashes!
    const flashEnvelope =
      lightningFlash > 0.02
        ? Math.min(1, lightningFlash * (0.7 + 0.45 * Math.sin(time * 52)))
        : 0;
    this.rainMat.opacity = 0.34 + flashEnvelope * 0.5;
    this.rainMat.color.setHex(
      flashEnvelope > 0.25 ? 0xf0f8ff : theme === 'PUNCTURE_INFERNO' ? 0xfdba74 : 0xbcd8ff
    );

    // 2. Intermittent Lightning Bolt + Foreground & Background Illumination
    if (lightningFlash > 0.72 && !this.lastFlashActive) {
      this.regenerateLightningBolt(cameraWorldX);
      this.lastFlashActive = true;
    } else if (lightningFlash < 0.1) {
      this.lastFlashActive = false;
    }
    this.lightningDirLight.intensity = flashEnvelope * 9.5;
    this.lightningRimLight.intensity = flashEnvelope * 58;
    this.boltMat.opacity = flashEnvelope > 0.22 ? flashEnvelope : 0;
    this.boltGlowMat.opacity = flashEnvelope > 0.22 ? flashEnvelope * 0.65 : 0;

    // 3. Localized Rain-Slicked Puddle Ripple Spawner across the wet road
    this.rippleSpawnTimer -= dt;
    if (this.rippleSpawnTimer <= 0) {
      this.rippleSpawnTimer = 0.065;
      const sx = cameraWorldX + (Math.random() - 0.5) * 26;
      const sz = -2.2 + Math.random() * 5.2;
      this.spawnLocalizedSplash(sx, 0, sz, 1);
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.age += dt;
      const t = rp.age / rp.maxAge;
      if (t >= 1) {
        this.group.remove(rp.mesh);
        (rp.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
      } else {
        rp.mesh.scale.setScalar(0.18 + t * rp.maxScale);
        (rp.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * (0.55 + flashEnvelope * 0.38);
      }
    }

    // 4. Localized Droplet Bounce Physics
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life -= dt;
      d.vy -= 9.8 * dt;
      d.x += d.vx * dt;
      d.y = Math.max(0.02, d.y + d.vy * dt);
      d.z += d.vz * dt;
      if (d.life <= 0) {
        this.drops.splice(i, 1);
      }
    }
    for (let i = 0; i < this.maxDrops; i++) {
      const d = this.drops[i];
      if (d) {
        this.dropPos[i * 3] = d.x;
        this.dropPos[i * 3 + 1] = d.y;
        this.dropPos[i * 3 + 2] = d.z;
      } else {
        this.dropPos[i * 3] = 0;
        this.dropPos[i * 3 + 1] = -999;
        this.dropPos[i * 3 + 2] = 0;
      }
    }
    this.dropGeo.attributes.position.needsUpdate = true;

    // 5. Rising Glowing Embers for Inferno & Brick Kiln
    const showEmbers = theme === 'PUNCTURE_INFERNO' || theme === 'EENT_BHATTA';
    this.emberPoints.visible = showEmbers;
    if (showEmbers) {
      for (let i = 0; i < this.emberCount; i++) {
        let ex = this.emberPos[i * 3] + Math.sin(time * 2.4 + i) * 0.6 * dt;
        let ey = this.emberPos[i * 3 + 1] + (1.8 + (i % 4) * 0.5) * dt;
        if (ey > 15) {
          ey = 0.2;
          ex = cameraWorldX + (Math.random() - 0.5) * 34;
        }
        this.emberPos[i * 3] = ex;
        this.emberPos[i * 3 + 1] = ey;
      }
      this.emberGeo.attributes.position.needsUpdate = true;
    }

    // 6. Sync Simulation Combat Particles (Sparks, Dust, Fire, Water, Steam)
    let ptr = 0;
    for (let i = 0; i < particles.length && ptr < this.maxVfx; i++) {
      const pt = particles[i];
      if (pt.kind === 'COMIC_TEXT') continue;
      this.vfxPos[ptr * 3] = pt.x * WORLD_SCALE;
      this.vfxPos[ptr * 3 + 1] = Math.max(0.08, pt.y * WORLD_SCALE);
      this.vfxPos[ptr * 3 + 2] = ((i % 7) - 3) * 0.08;
      this.tempColor.set(pt.color);
      this.vfxCol[ptr * 3] = this.tempColor.r;
      this.vfxCol[ptr * 3 + 1] = this.tempColor.g;
      this.vfxCol[ptr * 3 + 2] = this.tempColor.b;
      ptr++;
    }
    for (let i = ptr; i < this.maxVfx; i++) {
      this.vfxPos[i * 3 + 1] = -999;
    }
    this.vfxGeo.attributes.position.needsUpdate = true;
    this.vfxGeo.attributes.color.needsUpdate = true;

    // 7. Sync Laal Mirch Crimson Smoke Clouds in 3D
    const activeSmokeIds = new Set<string>();
    for (const sc of smokeClouds) {
      activeSmokeIds.add(sc.id);
      let grp = this.smokeMeshes.get(sc.id);
      if (!grp) {
        grp = new THREE.Group();
        for (let p = 0; p < 5; p++) {
          const sp = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: this.softGlow,
              color: p % 2 === 0 ? 0xb91c1c : 0x7f1d1d,
              transparent: true,
              opacity: 0.65,
              depthWrite: false,
            })
          );
          sp.position.set((p - 2) * 0.68, 0.8 + (p % 2) * 0.55, ((p % 3) - 1) * 0.4);
          sp.scale.setScalar(2.6 + (p % 2) * 0.8);
          grp.add(sp);
        }
        this.group.add(grp);
        this.smokeMeshes.set(sc.id, grp);
      }
      grp.position.set(sc.x * WORLD_SCALE, sc.y * WORLD_SCALE, 0.35);
      const alpha = Math.min(1, sc.life / 1.2) * 0.68;
      grp.children.forEach((child, idx) => {
        const sp = child as THREE.Sprite;
        sp.material.opacity = alpha;
        sp.position.y = 0.85 + Math.sin(time * 2.5 + idx) * 0.25;
      });
    }
    for (const [id, grp] of this.smokeMeshes.entries()) {
      if (!activeSmokeIds.has(id)) {
        this.group.remove(grp);
        grp.children.forEach((c) => (c as THREE.Sprite).material.dispose());
        this.smokeMeshes.delete(id);
      }
    }

    // 8. Update Floating Comic Text Billboards
    for (let i = this.textBillboards.length - 1; i >= 0; i--) {
      const tb = this.textBillboards[i];
      tb.life -= dt;
      tb.sprite.position.y += tb.vy * dt;
      const t = Math.max(0, tb.life / tb.maxLife);
      tb.sprite.material.opacity = Math.min(1, t * 1.5);
      if (tb.life <= 0) {
        this.group.remove(tb.sprite);
        tb.sprite.material.dispose();
        this.textBillboards.splice(i, 1);
      }
    }
  }

  public dispose(): void {
    this.rainGeo.dispose();
    this.rainMat.dispose();
    this.rippleGeo.dispose();
    this.rippleMat.dispose();
    this.dropGeo.dispose();
    this.dropMat.dispose();
    this.emberGeo.dispose();
    this.emberMat.dispose();
    this.boltGeo.dispose();
    this.boltMat.dispose();
    this.boltGlowMat.dispose();
    this.vfxGeo.dispose();
    (this.vfxPoints.material as THREE.Material).dispose();
    for (const rp of this.ripples) {
      (rp.mesh.material as THREE.Material).dispose();
    }
    for (const grp of this.smokeMeshes.values()) {
      grp.children.forEach((c) => (c as THREE.Sprite).material.dispose());
    }
    for (const tb of this.textBillboards) {
      tb.sprite.material.dispose();
    }
    for (const tex of this.textTextureCache.values()) {
      tex.dispose();
    }
    this.textTextureCache.clear();
  }
}
