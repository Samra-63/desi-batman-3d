import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createBatBhensaRig,
  createDesiBatmanRig,
  createEnemyRig,
  createLanternMesh,
  createSamosaMesh,
  createVillageKidRig,
  updateBatBhensaRig,
  updateDesiBatmanRig,
  updateEnemyRig,
  WORLD_SCALE,
  type BatBhensaRig,
  type DesiBatmanRig,
  type EnemyRig,
  type VillageKidRig,
} from './models3d';
import { createGame3DTextures, type Game3DTextures } from './textures3d';
import type {
  BatBhensaState,
  ChapterConfig,
  EnemyEntity,
  LanternProp,
  Particle,
  Pickup,
  PlayerState,
  Projectile,
  SmokeCloud,
  VillageKid,
  WorldTheme,
} from './types';
import { Weather3DSystem } from './weather3d';

export interface Render3DFrameInput {
  dt: number;
  time: number;
  cameraX: number;
  cameraZoom: number;
  shakeX: number;
  shakeY: number;
  lightningFlash: number;
  slowMoFactor: number;
  config: ChapterConfig;
  player: PlayerState;
  bhensa: BatBhensaState;
  enemies: EnemyEntity[];
  projectiles: Projectile[];
  lanterns: LanternProp[];
  smokeClouds: SmokeCloud[];
  pickups: Pickup[];
  kids: VillageKid[];
  particles: Particle[];
  titleShowcase: boolean;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class DarkRakhwala3DRenderer {
  public readonly isSoftwareGl: boolean;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly weather: Weather3DSystem;

  private container: HTMLElement;
  private textures: Game3DTextures;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private infernoLight: THREE.PointLight;

  private worldGroup = new THREE.Group();
  private batSignalGroup = new THREE.Group();
  private batSignalDisc!: THREE.Mesh;
  private kilnSmokePuffs: THREE.Mesh[] = [];
  private sarsonInstanced: THREE.InstancedMesh | null = null;
  private roadMat!: THREE.MeshStandardMaterial;
  private baseFogColor = new THREE.Color(0x0c1324);
  private flashFogColor = new THREE.Color(0x3a5482);
  private tempColor = new THREE.Color();

  private batmanRig: DesiBatmanRig;
  private bhensaRig: BatBhensaRig;
  private enemyRigs = new Map<string, EnemyRig>();
  private kidRigs = new Map<string, VillageKidRig>();
  private lanternMeshes = new Map<string, THREE.Group>();
  private pickupMeshes = new Map<string, THREE.Group>();
  private projectileMeshes = new Map<string, THREE.Group>();

  private currentWorldKey = '';
  private camPosX = 18;
  private camPosY = 4.2;
  private camPosZ = 13.5;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.className = 'cursor-crosshair';

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090f1d);
    this.scene.fog = new THREE.FogExp2(0x0c1324, 0.022);

    const w = Math.max(1, container.clientWidth || window.innerWidth);
    const h = Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(44, w / h, 0.2, 160);
    this.camera.position.set(18, 4.2, 13.5);
    this.renderer.setSize(w, h);

    // Mandatory Studio IBL (RoomEnvironment) so wet road puddles, Batarangs & silver pendant reflect crisply
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    pmrem.dispose();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createGame3DTextures(maxAniso);

    // 3-Point Arkham Twilight Lighting Rig (Warm Lantern Key + Cool Twilight Hemisphere + Blue Back Rim)
    this.hemiLight = new THREE.HemisphereLight(0x4b6fa8, 0x2a1f19, 1.05);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffcb80, 1.55);
    this.keyLight.position.set(12, 18, 12);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.camera.near = 1;
      this.keyLight.shadow.camera.far = 55;
      this.keyLight.shadow.camera.left = -18;
      this.keyLight.shadow.camera.right = 18;
      this.keyLight.shadow.camera.top = 14;
      this.keyLight.shadow.camera.bottom = -10;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.rimLight = new THREE.DirectionalLight(0x60a5fa, 1.15);
    this.rimLight.position.set(-10, 11, -12);
    this.scene.add(this.rimLight);

    this.infernoLight = new THREE.PointLight(0xf97316, 0, 26, 1.5);
    this.infernoLight.position.set(20, 3.2, -2.5);
    this.scene.add(this.infernoLight);

    // Volumetric 3D Bat-Signal Beam & Cloud Disc
    this.buildBatSignal();
    this.scene.add(this.batSignalGroup);

    // World Container
    this.scene.add(this.worldGroup);

    // Hero & Companion Rigs
    this.batmanRig = createDesiBatmanRig(this.textures);
    this.scene.add(this.batmanRig.root, this.batmanRig.capeMesh);

    this.bhensaRig = createBatBhensaRig();
    this.scene.add(this.bhensaRig.root);

    // Dedicated Dynamic 3D Rain-Slicked Weather & Lightning System
    this.weather = new Weather3DSystem(this.textures);
    this.scene.add(this.weather.group);
  }

  private buildBatSignal(): void {
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.085,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.8, 22, 18, 1, true), coneMat);
    cone.position.set(0, 10, 0);
    cone.rotation.z = 0.42;
    this.batSignalGroup.add(cone);

    const discMat = new THREE.MeshBasicMaterial({
      map: this.textures.batSignalDisc,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.batSignalDisc = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.6), discMat);
    this.batSignalDisc.position.set(-4.4, 15.6, 0);
    this.batSignalGroup.add(this.batSignalDisc);
  }

  public rebuildWorld(config: ChapterConfig): void {
    const key = `${config.id}-${config.theme}-${config.arenaWidth}`;
    if (key === this.currentWorldKey) return;
    this.currentWorldKey = key;

    // Clean old static world meshes
    while (this.worldGroup.children.length > 0) {
      const child = this.worldGroup.children[0];
      this.worldGroup.remove(child);
    }
    this.kilnSmokePuffs = [];
    this.sarsonInstanced = null;

    const arenaW = config.arenaWidth * WORLD_SCALE;
    const centerX = arenaW * 0.5;
    this.applyThemePalette(config.theme);

    // 1. Extended Rain-Slicked Village Ground & Wet Puddle Road (no boxed void edges!)
    this.roadMat = new THREE.MeshStandardMaterial({
      map: this.textures.roadAlbedo,
      roughnessMap: this.textures.roadRoughness,
      roughness: 0.55,
      metalness: 0.24,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(arenaW + 60, 18), this.roadMat);
    road.rotation.x = -Math.PI * 0.5;
    road.position.set(centerX, 0, 1.2);
    road.receiveShadow = true;
    this.worldGroup.add(road);

    // Extended deep village terrain behind & ahead of road
    const farGround = new THREE.Mesh(
      new THREE.PlaneGeometry(arenaW + 90, 90),
      new THREE.MeshStandardMaterial({
        color: config.theme === 'EENT_BHATTA' ? 0x1a1211 : 0x151c12,
        roughness: 0.95,
      })
    );
    farGround.rotation.x = -Math.PI * 0.5;
    farGround.position.set(centerX, -0.04, -36);
    this.worldGroup.add(farGround);

    // 2. Long Textured Mud Boundary Wall covered in Cow-Dung Cakes (Uplay)
    const wallMat = new THREE.MeshStandardMaterial({
      map: this.textures.uplayWallAlbedo,
      bumpMap: this.textures.uplayWallBump,
      bumpScale: 0.14,
      roughness: 0.86,
    });
    const mudWall = new THREE.Mesh(new THREE.BoxGeometry(arenaW + 36, 1.55, 0.55), wallMat);
    mudWall.position.set(centerX, 0.77, -3.1);
    mudWall.receiveShadow = true;
    mudWall.castShadow = true;
    this.worldGroup.add(mudWall);

    // 3. Traversable 3D Mud Houses (Kachay Makan) / Rooftop Platforms
    const mudHouseMat = new THREE.MeshStandardMaterial({ color: 0x4c3b2c, roughness: 0.9 });
    const kilnBrickMat = new THREE.MeshStandardMaterial({
      map: this.textures.brickAlbedo,
      roughness: 0.85,
    });
    const roofRimMat = new THREE.MeshStandardMaterial({ color: 0xc2aa86, roughness: 0.72 });
    const winGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.3,
    });

    for (const p of config.platforms) {
      const pw = p.w * WORLD_SCALE;
      const py = p.y * WORLD_SCALE;
      const px = (p.x + p.w * 0.5) * WORLD_SCALE;

      const houseBody = new THREE.Mesh(
        new THREE.BoxGeometry(pw, py, 2.8),
        p.kind === 'KILN_LEDGE' ? kilnBrickMat : mudHouseMat
      );
      houseBody.position.set(px, py * 0.5, -2.55);
      houseBody.castShadow = true;
      houseBody.receiveShadow = true;
      this.worldGroup.add(houseBody);

      // Walkable 3D Rooftop Slab projecting slightly into combat lane Z=0
      const slab = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.3, 0.24, 3.6), roofRimMat);
      slab.position.set(px, py - 0.12, -1.2);
      slab.receiveShadow = true;
      slab.castShadow = true;
      this.worldGroup.add(slab);

      // Glowing Shutter Window
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.82, 0.1), winGlowMat);
      win.position.set(px - pw * 0.22, py * 0.55, -1.12);
      this.worldGroup.add(win);

      // Clothesline Poles & Fluttering Cloth on Mud Roofs
      if (p.hasClothesline) {
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b1e15, roughness: 0.9 });
        const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.15, 6), poleMat);
        pL.position.set(px - pw * 0.42, py + 0.55, -2.1);
        const pR = pL.clone();
        pR.position.x = px + pw * 0.42;
        const cloth = new THREE.Mesh(
          new THREE.PlaneGeometry(0.7, 0.52),
          new THREE.MeshStandardMaterial({ color: 0xb93f34, side: THREE.DoubleSide, roughness: 0.85 })
        );
        cloth.position.set(px, py + 0.72, -2.1);
        this.worldGroup.add(pL, pR, cloth);
      }
    }

    // 4. Roadside Chai Ka Hotel (Chai Dhaba) Landmark
    if (config.dhabaX !== undefined) {
      const dx = config.dhabaX * WORLD_SCALE;
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 0.78, 0.14),
        new THREE.MeshStandardMaterial({
          map: this.textures.dhabaSign,
          emissive: 0xf59e0b,
          emissiveMap: this.textures.dhabaSign,
          emissiveIntensity: 0.65,
          roughness: 0.45,
        })
      );
      sign.position.set(dx, 3.55, -1.0);
      this.worldGroup.add(sign);

      // Brass Boiling Samovar Kettle & Wooden Charpai
      const samovar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 0.82, 12),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.82, roughness: 0.28 })
      );
      samovar.position.set(dx - 1.5, 0.55, -1.8);
      const charpai = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.16, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.88 })
      );
      charpai.position.set(dx + 1.35, 0.42, -1.8);
      this.worldGroup.add(samovar, charpai);

      // Warm Dhaba PointLight
      const dhabaLight = new THREE.PointLight(0xf59e0b, 7.5, 14, 1.5);
      dhabaLight.position.set(dx, 2.7, -0.5);
      this.worldGroup.add(dhabaLight);
    }

    // 5. Village Cast-Iron Handpump (Nalka)
    if (config.nalkaX !== undefined) {
      const nx = config.nalkaX * WORLD_SCALE;
      const ironMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.76,
        roughness: 0.35,
      });
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.35, 10), ironMat);
      col.position.set(nx, 0.68, -1.85);
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), ironMat);
      spout.rotation.z = Math.PI * 0.42;
      spout.position.set(nx + 0.22, 1.0, -1.85);
      const trough = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.32, 0.78),
        new THREE.MeshStandardMaterial({ color: 0x543227, roughness: 0.88 })
      );
      trough.position.set(nx + 0.18, 0.16, -1.85);
      this.worldGroup.add(col, spout, trough);
    }

    // 6. Supresh Mangal Repairing Puncture Shop (Burning Inferno in Chapter 4!)
    if (config.punctureShopX !== undefined) {
      const px = config.punctureShopX * WORLD_SCALE;
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(5.1, 0.86, 0.16),
        new THREE.MeshStandardMaterial({
          map: this.textures.punctureSign,
          emissive: 0xf97316,
          emissiveMap: this.textures.punctureSign,
          emissiveIntensity: 0.95,
          roughness: 0.4,
        })
      );
      sign.position.set(px, 3.65, -0.95);
      this.worldGroup.add(sign);

      // Hanging Rubber Bicycle Tires
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.85 });
      for (let t = 0; t < 3; t++) {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 8, 16), tireMat);
        tire.position.set(px - 2.1 + t * 0.65, 2.25, -1.25);
        this.worldGroup.add(tire);
      }
      this.infernoLight.position.set(px, 2.8, -0.6);
      this.infernoLight.intensity = 18;
    } else {
      this.infernoLight.intensity = 0;
    }

    // 7. Towering 3D Eent Bhatta (Brick Kiln) Chimney & Rising Smoke in Background
    const kilnX = (config.kilnX ?? config.arenaWidth * 0.65) * WORLD_SCALE;
    const kilnZ = config.theme === 'EENT_BHATTA' ? -9.5 : -17;
    const kilnScale = config.theme === 'EENT_BHATTA' ? 1.35 : 1.0;

    const kilnMound = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2 * kilnScale, 5.2 * kilnScale, 2.2 * kilnScale, 12),
      kilnBrickMat
    );
    kilnMound.position.set(kilnX, 1.1 * kilnScale, kilnZ);
    const chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65 * kilnScale, 1.65 * kilnScale, 15.5 * kilnScale, 14),
      kilnBrickMat
    );
    chimney.position.set(kilnX, 9.2 * kilnScale, kilnZ);
    const furnaceGlow = new THREE.Mesh(
      new THREE.BoxGeometry(2.8 * kilnScale, 1.0 * kilnScale, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xea580c })
    );
    furnaceGlow.position.set(kilnX, 0.7 * kilnScale, kilnZ + 4.3 * kilnScale);
    this.worldGroup.add(kilnMound, chimney, furnaceGlow);

    // Kiln Smoke Plumes
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0x1e222e,
      transparent: true,
      opacity: 0.55,
      roughness: 1,
    });
    for (let s = 0; s < 5; s++) {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 * kilnScale, 1), smokeMat);
      puff.position.set(kilnX, 17.5 * kilnScale + s * 1.4, kilnZ);
      puff.userData = { baseX: kilnX, baseY: 17.2 * kilnScale, phase: s * 0.2 };
      this.worldGroup.add(puff);
      this.kilnSmokePuffs.push(puff);
    }

    // 8. Instanced Swaying Golden Sarson (Mustard) Fields + Turbaned Kisan Farmers + Distant Trees
    if (config.theme !== 'EENT_BHATTA') {
      const stalkCount = 260;
      const stalkGeo = new THREE.ConeGeometry(0.2, 1.25, 5);
      const stalkMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
      const inst = new THREE.InstancedMesh(stalkGeo, stalkMat, stalkCount);
      const dummy = new THREE.Object3D();
      const c = new THREE.Color();
      for (let i = 0; i < stalkCount; i++) {
        const sx = -8 + (i / stalkCount) * (arenaW + 16) + Math.sin(i * 19) * 0.6;
        const sz = -4.2 - (i % 5) * 1.65;
        const sc = 0.85 + ((i * 13) % 30) * 0.01;
        dummy.position.set(sx, 0.62 * sc, sz);
        dummy.scale.set(sc, sc, sc);
        dummy.rotation.z = Math.sin(i) * 0.14;
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        c.setHex(i % 3 === 0 ? 0xd4a024 : i % 3 === 1 ? 0xb5851d : 0x3f5e24);
        inst.setColorAt(i, c);
      }
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.frustumCulled = false;
      this.worldGroup.add(inst);
      this.sarsonInstanced = inst;

      // Animated Kisan Farmers in Sarson Fields
      const kurtaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
      const turbanMat = new THREE.MeshStandardMaterial({ color: 0xe7dcc3, roughness: 0.85 });
      for (let k = 0; k < 4; k++) {
        const kx = 5 + k * (arenaW / 4);
        const farmer = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.2, 8), kurtaMat);
        body.position.y = 0.7;
        const turban = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), turbanMat);
        turban.position.y = 1.48;
        farmer.add(body, turban);
        farmer.position.set(kx, 0, -6.2);
        this.worldGroup.add(farmer);
      }
    }

    // Distant Neem & Palm Silhouettes (Background Layer illuminated by lightning!)
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x1a1614, roughness: 0.95 });
    const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x14221a, roughness: 0.9 });
    for (let t = -2; t <= 12; t++) {
      const tx = t * (arenaW / 10);
      const tz = -11 - (Math.abs(t * 7) % 6);
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 4.4, 7), treeTrunkMat);
      trunk.position.y = 2.2;
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.1, 1), treeFoliageMat);
      crown.position.y = 4.6;
      tree.add(trunk, crown);
      tree.position.set(tx, 0, tz);
      this.worldGroup.add(tree);
    }

    // 9. Comic-Style Foreground Framing Layer (+Z) that catches intermittent lightning rim flashes!
    const fgWoodMat = new THREE.MeshStandardMaterial({
      color: 0x161924,
      roughness: 0.42, // rain-slicked wet foreground wood/iron
      metalness: 0.18,
    });
    for (let f = 0; f < 6; f++) {
      const fx = 2 + f * (arenaW / 5.5);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.65, 8), fgWoodMat);
      post.position.set(fx, 0.82, 4.6);
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.65, 0.75), fgWoodMat);
      crate.position.set(fx + 0.7, 0.32, 4.9);
      crate.rotation.y = 0.24 * (f % 2 === 0 ? 1 : -1);
      this.worldGroup.add(post, crate);
    }
  }

  private applyThemePalette(theme: WorldTheme): void {
    if (theme === 'PUNCTURE_INFERNO') {
      this.baseFogColor.setHex(0x241110);
      this.keyLight.color.setHex(0xff9d5c);
      this.hemiLight.color.setHex(0x7c3a28);
    } else if (theme === 'EENT_BHATTA') {
      this.baseFogColor.setHex(0x1a1119);
      this.keyLight.color.setHex(0xffb478);
      this.hemiLight.color.setHex(0x4b4275);
    } else {
      this.baseFogColor.setHex(0x0b1222);
      this.keyLight.color.setHex(0xffd088);
      this.hemiLight.color.setHex(0x4c71ad);
    }
    this.scene.background = this.baseFogColor.clone();
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.baseFogColor);
    }
  }

  public render(input: Render3DFrameInput): void {
    this.rebuildWorld(input.config);

    const camTargetX = input.cameraX * WORLD_SCALE;
    const playerY = input.player.y * WORLD_SCALE;
    const desiredZoomZ = 13.6 / Math.max(0.85, input.cameraZoom);
    const desiredY = 3.9 + playerY * 0.42;

    this.camPosX = THREE.MathUtils.damp(this.camPosX, camTargetX, 7.5, input.dt);
    this.camPosY = THREE.MathUtils.damp(this.camPosY, desiredY, 6.0, input.dt);
    this.camPosZ = THREE.MathUtils.damp(this.camPosZ, desiredZoomZ, 6.5, input.dt);

    // Subtle Arkham cinematic perspective shift during Slow-Mo Counter or Bat-Bhensa
    const dramaticOffsetX = input.slowMoFactor < 0.75 ? input.player.facing * 1.45 : 0;
    this.camera.position.set(
      this.camPosX + dramaticOffsetX + input.shakeX * 0.035,
      this.camPosY + input.shakeY * 0.035,
      this.camPosZ
    );
    this.camera.lookAt(this.camPosX, 2.0 + playerY * 0.35, -0.5);

    // Keep shadow frustum centered on player action
    this.keyLight.position.set(this.camPosX + 9, 17, 11);
    this.keyLight.target.position.set(this.camPosX, 0, 0);

    // Sweep Bat-Signal gently in sky
    this.batSignalGroup.position.set(
      this.camPosX + 8.5 + Math.sin(input.time * 0.35) * 1.8,
      0.5,
      -20
    );

    // Animate Kiln Smoke Plumes
    for (const puff of this.kilnSmokePuffs) {
      const p = ((input.time * 0.18 + (puff.userData.phase as number)) % 1);
      puff.position.x = (puff.userData.baseX as number) - p * 4.2;
      puff.position.y = (puff.userData.baseY as number) + p * 7.5;
      puff.scale.setScalar(0.8 + p * 1.9);
    }

    // Dynamic Lightning Sky & Wet-Road Illumination!
    const flash = input.lightningFlash;
    this.tempColor.copy(this.baseFogColor).lerp(this.flashFogColor, flash * 0.72);
    (this.scene.background as THREE.Color).copy(this.tempColor);
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.tempColor);
    }
    // Wet road reflects lightning starkly by temporarily tightening roughness
    if (this.roadMat) {
      this.roadMat.roughness = 0.52 - flash * 0.26;
    }
    if (input.config.punctureShopX !== undefined) {
      this.infernoLight.intensity = 16 + Math.sin(input.time * 14) * 4.5;
    }

    // Update Hero & Bat-Bhensa
    updateDesiBatmanRig(this.batmanRig, input.player, input.time);
    updateBatBhensaRig(this.bhensaRig, input.bhensa, input.time);

    // Sync Enemies
    this.syncEnemies(input.enemies, input.time);
    this.syncVillageKids(input.kids);
    this.syncLanterns(input.lanterns, input.time);
    this.syncPickups(input.pickups, input.time);
    this.syncProjectiles(input.projectiles);

    // Update 3D Rain-Slicked Weather, Splashes, Lightning Bolts & Combat Particles
    this.weather.update(
      input.dt,
      input.time,
      this.camPosX,
      input.config.theme,
      input.lightningFlash,
      input.particles,
      input.smokeClouds
    );

    this.renderer.render(this.scene, this.camera);
  }

  private syncEnemies(enemies: EnemyEntity[], time: number): void {
    const alive = new Set<string>();
    for (const e of enemies) {
      if (e.state === 'DEAD') continue;
      alive.add(e.id);
      let rig = this.enemyRigs.get(e.id);
      if (!rig) {
        rig = createEnemyRig(e, this.textures);
        this.scene.add(rig.root);
        this.enemyRigs.set(e.id, rig);
      }
      updateEnemyRig(rig, e, time);
    }
    for (const [id, rig] of this.enemyRigs.entries()) {
      if (!alive.has(id)) {
        this.scene.remove(rig.root);
        this.enemyRigs.delete(id);
      }
    }
  }

  private syncVillageKids(kids: VillageKid[]): void {
    const active = new Set<string>();
    for (const k of kids) {
      active.add(k.id);
      let rig = this.kidRigs.get(k.id);
      if (!rig) {
        rig = createVillageKidRig(k);
        this.scene.add(rig.root);
        this.kidRigs.set(k.id, rig);
      }
      rig.root.position.set(k.x * WORLD_SCALE, 0, -1.4);
      rig.root.rotation.y = k.facing === 1 ? 0 : Math.PI;
      const swing = Math.sin(k.runPhase) * 0.65;
      rig.leftLeg.rotation.z = swing;
      rig.rightLeg.rotation.z = -swing;
      rig.tire.rotation.z = -k.tireAngle;
    }
    for (const [id, rig] of this.kidRigs.entries()) {
      if (!active.has(id)) {
        this.scene.remove(rig.root);
        this.kidRigs.delete(id);
      }
    }
  }

  private syncLanterns(lanterns: LanternProp[], time: number): void {
    const active = new Set<string>();
    for (const l of lanterns) {
      active.add(l.id);
      let mesh = this.lanternMeshes.get(l.id);
      if (!mesh) {
        mesh = createLanternMesh();
        this.scene.add(mesh);
        this.lanternMeshes.set(l.id, mesh);
      }
      mesh.visible = !l.exploded;
      const sway = Math.sin(time * 2.6 + l.swingPhase) * 0.16;
      mesh.position.set(l.x * WORLD_SCALE + sway, l.y * WORLD_SCALE, 0);
      mesh.rotation.z = sway * 0.9;
    }
    for (const [id, mesh] of this.lanternMeshes.entries()) {
      if (!active.has(id)) {
        this.scene.remove(mesh);
        this.lanternMeshes.delete(id);
      }
    }
  }

  private syncPickups(pickups: Pickup[], time: number): void {
    const active = new Set<string>();
    for (const pk of pickups) {
      active.add(pk.id);
      let mesh = this.pickupMeshes.get(pk.id);
      if (!mesh) {
        mesh = createSamosaMesh();
        this.scene.add(mesh);
        this.pickupMeshes.set(pk.id, mesh);
      }
      mesh.position.set(
        pk.x * WORLD_SCALE,
        pk.y * WORLD_SCALE + Math.sin(time * 5 + pk.bobPhase) * 0.09,
        0
      );
      mesh.rotation.y = time * 2.8;
    }
    for (const [id, mesh] of this.pickupMeshes.entries()) {
      if (!active.has(id)) {
        this.scene.remove(mesh);
        this.pickupMeshes.delete(id);
      }
    }
  }

  private syncProjectiles(projectiles: Projectile[]): void {
    const active = new Set<string>();
    for (const pr of projectiles) {
      active.add(pr.id);
      let mesh = this.projectileMeshes.get(pr.id);
      if (!mesh) {
        mesh = new THREE.Group();
        if (pr.kind === 'BATARANG') {
          const wing = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.16, 0.05),
            new THREE.MeshStandardMaterial({
              color: 0xe2e8f0,
              metalness: 0.95,
              roughness: 0.14,
              emissive: 0x60a5fa,
              emissiveIntensity: 0.35,
            })
          );
          mesh.add(wing);
        } else if (pr.kind === 'SUPER_COIN' || pr.kind === 'DEFLECTED_COIN') {
          const coin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, 0.06, 14),
            new THREE.MeshStandardMaterial({
              color: 0xfde047,
              metalness: 0.9,
              roughness: 0.15,
              emissive: 0xfacc15,
              emissiveIntensity: 0.8,
            })
          );
          coin.rotation.x = Math.PI * 0.5;
          mesh.add(coin);
        } else if (pr.kind === 'SMOKE_BOMB') {
          const bomb = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.26, 8),
            new THREE.MeshStandardMaterial({ color: 0xb91c1c, emissive: 0xef4444, emissiveIntensity: 0.45 })
          );
          mesh.add(bomb);
        } else {
          const fire = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xf97316 })
          );
          mesh.add(fire);
        }
        this.scene.add(mesh);
        this.projectileMeshes.set(pr.id, mesh);
      }
      mesh.position.set(pr.x * WORLD_SCALE, pr.y * WORLD_SCALE, 0.1);
      mesh.rotation.z = pr.rotation;
    }
    for (const [id, mesh] of this.projectileMeshes.entries()) {
      if (!active.has(id)) {
        this.scene.remove(mesh);
        this.projectileMeshes.delete(id);
      }
    }
  }

  public resize(): void {
    const w = Math.max(1, this.container.clientWidth || window.innerWidth);
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  }

  public afterDraw(cb: () => void): number {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      return window.setTimeout(cb, 80);
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        window.setTimeout(cb, 80);
      }
    };
    return window.setTimeout(poll, 5);
  }

  public dispose(): void {
    this.weather.dispose();
    this.textures.dispose();
    this.envRenderTarget.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
