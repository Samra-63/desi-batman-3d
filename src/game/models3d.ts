import * as THREE from 'three';
import type { Game3DTextures } from './textures3d';
import type { BatBhensaState, EnemyEntity, PlayerState, VillageKid } from './types';

export const WORLD_SCALE = 0.0175; // Maps simulation px (e.g. 120px tall Batman) -> ~2.1m realistic 3D height!

export interface DesiBatmanRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  jhaadu: THREE.Group;
  slashArc: THREE.Mesh;
  eyeLeft: THREE.Mesh;
  eyeRight: THREE.Mesh;
  capeMesh: THREE.Mesh;
  capeGeo: THREE.BufferGeometry;
}

export interface BatBhensaRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  legs: THREE.Group[];
  tail: THREE.Mesh;
  pendantGroup: THREE.Group;
}

export interface EnemyRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftLeg?: THREE.Group;
  rightLeg?: THREE.Group;
  weaponArm?: THREE.Group;
  shieldMesh?: THREE.Mesh;
  wheels?: THREE.Mesh[];
  telegraphBolt: THREE.Group;
  hpBarBg: THREE.Mesh;
  hpBarFill: THREE.Mesh;
  laserBeam?: THREE.Group;
  capeMesh?: THREE.Mesh;
  staggerRing?: THREE.Mesh;
  hitMaterials: THREE.MeshStandardMaterial[];
}

export interface VillageKidRig {
  root: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  tire: THREE.Mesh;
}

export function createDesiBatmanRig(textures: Game3DTextures): DesiBatmanRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const tunicMat = new THREE.MeshStandardMaterial({
    map: textures.batmanTunic,
    roughness: 0.72,
    metalness: 0.06,
  });
  const cowlMat = new THREE.MeshStandardMaterial({
    color: 0x0c0f17,
    roughness: 0.62,
    metalness: 0.14,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x9c6644,
    roughness: 0.68,
    metalness: 0.02,
  });
  const pantMat = new THREE.MeshStandardMaterial({
    color: 0x1e2533,
    roughness: 0.78,
    metalness: 0.05,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0x926236,
    roughness: 0.92,
    metalness: 0.0,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.25,
    metalness: 0.88,
  });
  const chappalMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a21,
    roughness: 0.85,
    metalness: 0.04,
  });

  // Sculpted Athletic Torso (trapezoidal heroic upper chest + tapered waist)
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.23, 0.68, 12), tunicMat);
  chest.position.set(0, 1.32, 0);
  chest.rotation.y = Math.PI * 0.5; // Front Bat emblem faces +X
  chest.castShadow = true;
  chest.receiveShadow = true;
  bodyPivot.add(chest);

  // Diagonal Braided Jute Rope across Chest (TubeGeometry)
  const ropeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.18, 1.66, -0.22),
    new THREE.Vector3(0.27, 1.44, 0.04),
    new THREE.Vector3(0.24, 1.06, 0.24),
    new THREE.Vector3(-0.22, 1.04, 0.12),
    new THREE.Vector3(-0.24, 1.38, -0.18),
  ]);
  const juteRope = new THREE.Mesh(new THREE.TubeGeometry(ropeCurve, 24, 0.036, 8, true), ropeMat);
  juteRope.castShadow = true;
  bodyPivot.add(juteRope);

  // Rope-Wrapped Utility Belt + Metal Buckle + Bamboo Canisters
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.25, 0.13, 14), ropeMat);
  belt.position.set(0, 0.96, 0);
  bodyPivot.add(belt);
  const buckle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 14), metalMat);
  buckle.rotation.z = Math.PI * 0.5;
  buckle.position.set(0.24, 0.96, 0);
  bodyPivot.add(buckle);
  for (let i = -1; i <= 1; i += 2) {
    const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.14, 8), ropeMat);
    canister.position.set(0.14, 0.96, i * 0.21);
    bodyPivot.add(canister);
  }

  // Head: Jaw + Mustache + Black Cloth Cowl + Stitched Ears + Glowing Eyes
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), skinMat);
  jaw.position.set(0.02, 1.79, 0);
  jaw.castShadow = true;
  bodyPivot.add(jaw);

  const cowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.186, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.64),
    cowlMat
  );
  cowl.position.set(0, 1.84, 0);
  cowl.castShadow = true;
  bodyPivot.add(cowl);

  // Stitched Bat Ears
  const earGeo = new THREE.ConeGeometry(0.055, 0.24, 5);
  const earL = new THREE.Mesh(earGeo, cowlMat);
  earL.position.set(-0.02, 2.06, 0.11);
  earL.rotation.x = 0.16;
  const earR = new THREE.Mesh(earGeo, cowlMat);
  earR.position.set(-0.02, 2.06, -0.11);
  earR.rotation.x = -0.16;
  bodyPivot.add(earL, earR);

  // Expressive Glowing White Detective Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.028, 0.06), eyeMat);
  eyeLeft.position.set(0.175, 1.85, 0.068);
  const eyeRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.028, 0.06), eyeMat);
  eyeRight.position.set(0.175, 1.85, -0.068);
  bodyPivot.add(eyeLeft, eyeRight);

  // Knotted Cape Collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.055, 8, 16), cowlMat);
  collar.rotation.x = Math.PI * 0.5;
  collar.position.set(0, 1.66, 0);
  bodyPivot.add(collar);

  // Articulated Legs with Desi Chappals
  const buildLeg = (zOffset: number) => {
    const leg = new THREE.Group();
    leg.position.set(0, 0.92, zOffset);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.34, 6, 10), pantMat);
    thigh.position.set(0, -0.22, 0);
    thigh.castShadow = true;
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.34, 6, 10), pantMat);
    shin.position.set(0, -0.62, 0);
    shin.castShadow = true;
    const chappal = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.12), chappalMat);
    chappal.position.set(0.05, -0.89, 0);
    leg.add(thigh, shin, chappal);
    return leg;
  };
  const leftLeg = buildLeg(0.13);
  const rightLeg = buildLeg(-0.13);
  bodyPivot.add(leftLeg, rightLeg);

  // Articulated Muscular Arms
  const buildArm = (zOffset: number) => {
    const arm = new THREE.Group();
    arm.position.set(0, 1.58, zOffset);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.26, 6, 10), tunicMat);
    upper.position.set(0, -0.18, 0);
    upper.castShadow = true;
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.25, 6, 10), skinMat);
    forearm.position.set(0.04, -0.46, 0);
    forearm.castShadow = true;
    const gauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.068, 0.14, 8), cowlMat);
    gauntlet.position.set(0.05, -0.5, 0);
    arm.add(upper, forearm, gauntlet);
    return arm;
  };
  const leftArm = buildArm(0.32);
  const rightArm = buildArm(-0.32);
  bodyPivot.add(leftArm, rightArm);

  // 3D Jhaadu (Village Broom-Staff) attached to front hand (visible on heavy hits/counters)
  const jhaadu = new THREE.Group();
  jhaadu.position.set(0.12, -0.58, 0);
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.032, 0.95, 8),
    ropeMat
  );
  handle.rotation.z = -Math.PI * 0.42;
  handle.position.set(0.35, 0.12, 0);
  const bristles = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.48, 9),
    new THREE.MeshStandardMaterial({ color: 0xd4a359, roughness: 0.95 })
  );
  bristles.rotation.z = Math.PI * 0.58;
  bristles.position.set(0.92, 0.28, 0);
  jhaadu.add(handle, bristles);
  jhaadu.visible = false;
  leftArm.add(jhaadu);

  // Kinetic 3D Slash Arc Ring
  const slashGeo = new THREE.RingGeometry(0.68, 1.05, 18, 1, -0.9, 1.9);
  const slashMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const slashArc = new THREE.Mesh(slashGeo, slashMat);
  slashArc.position.set(0.55, 1.25, 0.1);
  slashArc.visible = false;
  bodyPivot.add(slashArc);

  // Real 3D Cloth-Physics Cape Ribbon Mesh (12 segments x 2 width vertices = 24 vertices)
  const segs = 12;
  const capeGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(segs * 2 * 3);
  const indices: number[] = [];
  for (let i = 0; i < segs - 1; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }
  capeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  capeGeo.setIndex(indices);

  const capeMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f1a,
    roughness: 0.58,
    metalness: 0.22,
    side: THREE.DoubleSide,
  });
  const capeMesh = new THREE.Mesh(capeGeo, capeMat);
  capeMesh.castShadow = true;
  capeMesh.frustumCulled = false;

  return {
    root,
    bodyPivot,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    jhaadu,
    slashArc,
    eyeLeft,
    eyeRight,
    capeMesh,
    capeGeo,
  };
}

export function updateDesiBatmanRig(
  rig: DesiBatmanRig,
  p: PlayerState,
  time: number
): void {
  const wx = p.x * WORLD_SCALE;
  const wy = p.y * WORLD_SCALE;
  rig.root.position.set(wx, wy, 0);
  rig.bodyPivot.rotation.y = p.facing === 1 ? 0 : Math.PI;

  const isSliding = p.action === 'SLIDE';
  const isGliding = p.action === 'GLIDE';
  const isAttack =
    p.action === 'ATTACK1' ||
    p.action === 'ATTACK2' ||
    p.action === 'ATTACK3' ||
    p.action === 'COUNTER' ||
    p.action === 'STEALTH_STRIKE';

  rig.bodyPivot.position.y = isSliding ? -0.35 : 0;
  rig.bodyPivot.rotation.z = isSliding
    ? 0.85
    : isGliding
    ? -0.32
    : Math.abs(p.vx) > 25 && p.grounded
    ? -0.14
    : 0;

  const stride = Math.abs(p.vx) > 25 && p.grounded ? Math.sin(p.stepPhase) : 0;
  rig.leftLeg.rotation.z = isGliding ? 0.35 : stride * 0.72;
  rig.rightLeg.rotation.z = isGliding ? -0.25 : -stride * 0.72;

  if (isAttack) {
    const swing = p.action === 'ATTACK2' ? 2.1 : 1.55;
    rig.leftArm.rotation.z = swing;
    rig.rightArm.rotation.z = -0.65;
    rig.jhaadu.visible = p.action === 'ATTACK3' || p.action === 'COUNTER' || p.action === 'STEALTH_STRIKE';
    rig.slashArc.visible = true;
    const mat = rig.slashArc.material as THREE.MeshBasicMaterial;
    mat.color.setHex(
      p.action === 'COUNTER' ? 0xfacc15 : p.action === 'STEALTH_STRIKE' ? 0xef4444 : 0xe2e8f0
    );
    rig.slashArc.rotation.z = Math.sin(time * 28) * 0.4;
  } else if (p.action === 'BATARANG' || p.action === 'SMOKE') {
    rig.leftArm.rotation.z = 1.85;
    rig.rightArm.rotation.z = -0.4;
    rig.jhaadu.visible = false;
    rig.slashArc.visible = false;
  } else if (isGliding) {
    rig.leftArm.rotation.z = 2.2;
    rig.leftArm.rotation.x = 0.65;
    rig.rightArm.rotation.z = 2.2;
    rig.rightArm.rotation.x = -0.65;
    rig.jhaadu.visible = false;
    rig.slashArc.visible = false;
  } else {
    rig.leftArm.rotation.x = 0;
    rig.rightArm.rotation.x = 0;
    rig.leftArm.rotation.z = -stride * 0.62;
    rig.rightArm.rotation.z = stride * 0.62;
    rig.jhaadu.visible = false;
    rig.slashArc.visible = false;
  }

  // Eye color flash on Counter
  (rig.eyeLeft.material as THREE.MeshBasicMaterial).color.setHex(
    p.action === 'COUNTER' ? 0xfacc15 : 0xf8fafc
  );

  // Update real 3D Cloth Cape vertices directly from Verlet simulation nodes
  const posAttr = rig.capeGeo.getAttribute('position') as THREE.BufferAttribute;
  const arr = posAttr.array as Float32Array;
  const nodes = p.capeNodes;
  for (let i = 0; i < nodes.length && i < 12; i++) {
    const n = nodes[i];
    const halfWidth = (isGliding ? 0.52 + i * 0.08 : 0.28 + i * 0.036);
    const waveZ = Math.sin(time * 9 + i * 0.6) * 0.06;
    const x3 = n.x * WORLD_SCALE;
    const y3 = n.y * WORLD_SCALE;

    const idx = i * 6;
    arr[idx] = x3;
    arr[idx + 1] = y3;
    arr[idx + 2] = halfWidth + waveZ;

    arr[idx + 3] = x3;
    arr[idx + 4] = y3;
    arr[idx + 5] = -halfWidth + waveZ;
  }
  posAttr.needsUpdate = true;
  rig.capeGeo.computeVertexNormals();
}

export function createBatBhensaRig(): BatBhensaRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const hideMat = new THREE.MeshStandardMaterial({
    color: 0x10131c,
    roughness: 0.36, // rain-slicked jet-black wet buffalo hide!
    metalness: 0.18,
  });
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0x3b4454,
    roughness: 0.32,
    metalness: 0.35,
  });
  const silverMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.14,
    metalness: 0.96,
    emissive: 0x94a3b8,
    emissiveIntensity: 0.38,
  });

  // Massive muscular barrel torso + powerful shoulder hump
  const barrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.35, 8, 14), hideMat);
  barrel.rotation.z = Math.PI * 0.5;
  barrel.position.set(0, 1.15, 0);
  barrel.castShadow = true;
  bodyGroup.add(barrel);

  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.56, 12, 10), hideMat);
  hump.scale.set(1.1, 0.95, 0.95);
  hump.position.set(0.55, 1.48, 0);
  hump.castShadow = true;
  bodyGroup.add(hump);

  // Sculpted Head & Snout
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.52, 0.52), hideMat);
  head.position.set(1.25, 1.35, 0);
  head.rotation.z = -0.25;
  head.castShadow = true;
  bodyGroup.add(head);

  // Curved Ridged 3D Water Buffalo Horns (TubeGeometry)
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.18, 1.54, side * 0.22),
      new THREE.Vector3(0.95, 1.72, side * 0.62),
      new THREE.Vector3(0.66, 2.02, side * 0.72),
      new THREE.Vector3(0.84, 2.24, side * 0.42),
    ]);
    const horn = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.085, 8, false), hornMat);
    horn.castShadow = true;
    bodyGroup.add(horn);

    // Glowing fierce amber eyes
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfde047 })
    );
    eye.position.set(1.42, 1.44, side * 0.23);
    bodyGroup.add(eye);
  }

  // Gleaming Silver Neck Chain & Ornate Crescent-Moon Bat-Pendant
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.045, 8, 22), silverMat);
  chain.rotation.y = Math.PI * 0.5;
  chain.position.set(0.88, 1.24, 0);
  bodyGroup.add(chain);

  const pendantGroup = new THREE.Group();
  pendantGroup.position.set(1.06, 0.74, 0);
  const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 20, Math.PI * 1.45), silverMat);
  crescent.rotation.y = Math.PI * 0.5;
  crescent.rotation.z = 0.6;
  const batCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), silverMat);
  pendantGroup.add(crescent, batCore);
  bodyGroup.add(pendantGroup);

  // 4 Articulated Muscular Legs
  const legPositions: Array<[number, number]> = [
    [0.64, 0.34],
    [0.64, -0.34],
    [-0.68, 0.34],
    [-0.68, -0.34],
  ];
  const legs: THREE.Group[] = [];
  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Group();
    leg.position.set(lx, 0.85, lz);
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.86, 10), hideMat);
    limb.position.set(0, -0.42, 0);
    limb.castShadow = true;
    leg.add(limb);
    bodyGroup.add(leg);
    legs.push(leg);
  }

  // Whipping Tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.82, 6), hideMat);
  tail.position.set(-1.12, 1.02, 0);
  tail.rotation.z = 0.45;
  bodyGroup.add(tail);

  return { root, bodyGroup, legs, tail, pendantGroup };
}

export function updateBatBhensaRig(rig: BatBhensaRig, b: BatBhensaState, time: number): void {
  rig.root.visible = b.active;
  if (!b.active) return;

  rig.root.position.set(b.x * WORLD_SCALE, b.y * WORLD_SCALE, 0);
  rig.root.rotation.y = b.facing === 1 ? 0 : Math.PI;
  rig.bodyGroup.position.y = Math.abs(Math.sin(b.gaitPhase)) * 0.14;

  const swing = Math.sin(b.gaitPhase) * 0.58;
  rig.legs[0].rotation.z = swing;
  rig.legs[1].rotation.z = -swing * 0.7;
  rig.legs[2].rotation.z = -swing;
  rig.legs[3].rotation.z = swing * 0.7;
  rig.tail.rotation.z = 0.45 + Math.sin(time * 16) * 0.25;
  rig.pendantGroup.rotation.z = Math.sin(b.pendantSwing) * 0.35;
}

export function createEnemyRig(enemy: EnemyEntity, textures: Game3DTextures): EnemyRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);
  const hitMaterials: THREE.MeshStandardMaterial[] = [];

  let leftLeg: THREE.Group | undefined;
  let rightLeg: THREE.Group | undefined;
  let weaponArm: THREE.Group | undefined;
  let shieldMesh: THREE.Mesh | undefined;
  let wheels: THREE.Mesh[] | undefined;
  let laserBeam: THREE.Group | undefined;
  let capeMesh: THREE.Mesh | undefined;
  let staggerRing: THREE.Mesh | undefined;

  if (enemy.type === 'LOADER_RICKSHAW') {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1d4234,
      roughness: 0.42,
      metalness: 0.52,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.35,
      metalness: 0.6,
    });
    hitMaterials.push(bodyMat);

    const cargoBed = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 1.35), bodyMat);
    cargoBed.position.set(-0.55, 0.92, 0);
    cargoBed.castShadow = true;
    bodyPivot.add(cargoBed);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 1.2), trimMat);
    cab.position.set(0.85, 1.05, 0);
    cab.castShadow = true;
    bodyPivot.add(cab);

    // Volumetric Headlight Cone
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.6, 14, 1, true), coneMat);
    cone.rotation.z = Math.PI * 0.5;
    cone.position.set(3.05, 0.72, 0);
    bodyPivot.add(cone);

    // Desi Joker silhouette in loader bed
    const jokerTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.2, 0.62, 10),
      new THREE.MeshStandardMaterial({ color: 0x5b21b6, roughness: 0.68 })
    );
    jokerTorso.position.set(-0.55, 1.65, 0);
    const jokerHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.6 })
    );
    jokerHead.position.set(-0.55, 2.08, 0);
    const jokerHair = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 })
    );
    jokerHair.position.set(-0.55, 2.12, 0);
    bodyPivot.add(jokerTorso, jokerHead, jokerHair);

    // 3 Spoked Wheels
    wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.2, 14);
    wheelGeo.rotateX(Math.PI * 0.5);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.78 });
    const wCoords: Array<[number, number]> = [
      [-1.05, 0.66],
      [-1.05, -0.66],
      [1.05, 0],
    ];
    for (const [wx, wz] of wCoords) {
      const wm = new THREE.Mesh(wheelGeo, wheelMat);
      wm.position.set(wx, 0.36, wz);
      bodyPivot.add(wm);
      wheels.push(wm);
    }
  } else if (enemy.type === 'DESI_SUPERMAN') {
    const chestMat = new THREE.MeshStandardMaterial({
      map: textures.supermanChest,
      roughness: 0.45,
      metalness: 0.25,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.28,
    });
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.62,
      side: THREE.DoubleSide,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xa06c4d, roughness: 0.65 });
    const beardMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.88 });
    const suitLegMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.48 });
    hitMaterials.push(chestMat);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.25, 0.72, 12), chestMat);
    torso.position.set(0, 1.38, 0);
    torso.rotation.y = Math.PI * 0.5;
    torso.castShadow = true;
    bodyPivot.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), skinMat);
    head.position.set(0, 1.9, 0);
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.215, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      beardMat
    );
    hair.position.set(0, 1.94, 0);
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), beardMat);
    beard.scale.set(0.95, 0.85, 0.95);
    beard.position.set(0.06, 1.78, 0);
    bodyPivot.add(head, hair, beard);

    // Blazing Crimson Heat-Vision Eyes
    const redEyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    const eL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), redEyeMat);
    eL.position.set(0.18, 1.92, 0.075);
    const eR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), redEyeMat);
    eR.position.set(0.18, 1.92, -0.075);
    bodyPivot.add(eL, eR);

    // Flowing Crimson Cape
    capeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.45), capeMat);
    capeMesh.position.set(-0.36, 1.12, 0);
    capeMesh.rotation.y = Math.PI * 0.5;
    capeMesh.rotation.x = 0.22;
    bodyPivot.add(capeMesh);

    leftLeg = new THREE.Group();
    leftLeg.position.set(0, 0.96, 0.14);
    leftLeg.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.65, 6, 8), suitLegMat));
    leftLeg.children[0].position.y = -0.45;
    rightLeg = new THREE.Group();
    rightLeg.position.set(0, 0.96, -0.14);
    rightLeg.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.65, 6, 8), suitLegMat));
    rightLeg.children[0].position.y = -0.45;
    bodyPivot.add(leftLeg, rightLeg);

    // 3D Crimson Heat-Vision Dual Laser Beam Group (world-oriented)
    laserBeam = new THREE.Group();
    const outerBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 16, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xdc2626,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      })
    );
    outerBeam.rotation.z = -Math.PI * 0.5;
    outerBeam.position.set(8, 0, 0);
    const coreBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff1f2 })
    );
    coreBeam.rotation.z = -Math.PI * 0.5;
    coreBeam.position.set(8, 0, 0);
    laserBeam.add(outerBeam, coreBeam);
    laserBeam.position.set(0, 1.92, 0);
    laserBeam.visible = false;
    root.add(laserBeam);

    // Stagger Finisher Ring
    staggerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.06, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    staggerRing.rotation.x = Math.PI * 0.5;
    staggerRing.position.set(0, 0.12, 0);
    staggerRing.visible = false;
    root.add(staggerRing);
  } else {
    // Humanoid Enemies: Thug, Shield Thug, Bottle Thrower, Desi Joker
    const isJoker = enemy.type === 'DESI_JOKER';
    const isShield = enemy.type === 'SHIELD_THUG';
    const isThrower = enemy.type === 'BOTTLE_THROWER';

    const torsoColor = isJoker ? 0x5b21b6 : isShield ? 0x3f4552 : isThrower ? 0x7c2d12 : 0x4b3f33;
    const torsoMat = new THREE.MeshStandardMaterial({ color: torsoColor, roughness: 0.72 });
    const pantMat = new THREE.MeshStandardMaterial({
      color: isJoker ? 0x4c1d95 : 0x222732,
      roughness: 0.8,
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: isJoker ? 0xe5e7eb : 0x9c6747,
      roughness: 0.65,
    });
    hitMaterials.push(torsoMat);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.66, 10), torsoMat);
    torso.position.set(0, 1.28, 0);
    torso.castShadow = true;
    bodyPivot.add(torso);

    if (isJoker) {
      const vest = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.56, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.72 })
      );
      vest.position.set(0.19, 1.28, 0);
      bodyPivot.add(vest);
    }

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.175, 10, 10), headMat);
    head.position.set(0, 1.8, 0);
    head.castShadow = true;
    bodyPivot.add(head);

    const hatColor = isJoker ? 0x166534 : isShield ? 0x1e293b : isThrower ? 0x991b1b : 0x57534e;
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.188, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
      new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.85 })
    );
    hair.position.set(0, 1.84, 0);
    bodyPivot.add(hair);

    // Legs
    leftLeg = new THREE.Group();
    leftLeg.position.set(0, 0.9, 0.12);
    const lM = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.62, 5, 8), pantMat);
    lM.position.y = -0.42;
    lM.castShadow = true;
    leftLeg.add(lM);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0, 0.9, -0.12);
    const rM = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.62, 5, 8), pantMat);
    rM.position.y = -0.42;
    rM.castShadow = true;
    rightLeg.add(rM);
    bodyPivot.add(leftLeg, rightLeg);

    // Weapon Arm
    weaponArm = new THREE.Group();
    weaponArm.position.set(0, 1.5, 0.3);
    const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.45, 5, 8), torsoMat);
    armMesh.position.y = -0.28;
    weaponArm.add(armMesh);

    if (isShield) {
      shieldMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.15, 0.62),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.82 })
      );
      shieldMesh.position.set(0.32, -0.25, -0.24);
      shieldMesh.castShadow = true;
      weaponArm.add(shieldMesh);
    } else if (isThrower) {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, 0.24, 8),
        new THREE.MeshStandardMaterial({
          color: 0xea580c,
          emissive: 0xf97316,
          emissiveIntensity: 0.9,
        })
      );
      bottle.position.set(0.14, -0.52, 0);
      weaponArm.add(bottle);
    } else {
      const lathi = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.038, 1.05, 8),
        new THREE.MeshStandardMaterial({ color: isJoker ? 0x94a3b8 : 0x78502c, roughness: 0.72 })
      );
      lathi.rotation.z = -Math.PI * 0.32;
      lathi.position.set(0.38, -0.35, 0);
      weaponArm.add(lathi);
    }
    bodyPivot.add(weaponArm);
  }

  // Electric-Gold 3D Counter Lightning Telegraph above enemy head
  const telegraphBolt = new THREE.Group();
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.08), boltMat);
  b1.rotation.z = 0.42;
  b1.position.set(-0.04, 0.14, 0);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.08), boltMat);
  b2.rotation.z = 0.42;
  b2.position.set(0.06, -0.12, 0);
  telegraphBolt.add(b1, b2);
  telegraphBolt.position.set(0, enemy.type === 'LOADER_RICKSHAW' ? 2.85 : 2.55, 0);
  telegraphBolt.visible = false;
  root.add(telegraphBolt);

  // Floating World-Space HP Bar for non-bosses
  const barW = enemy.type === 'LOADER_RICKSHAW' ? 1.6 : 0.9;
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(barW, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x090c14 })
  );
  hpBarBg.position.set(0, enemy.type === 'LOADER_RICKSHAW' ? 2.45 : 2.25, 0.1);
  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(barW - 0.04, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xdc2626 })
  );
  hpBarFill.position.set(0, enemy.type === 'LOADER_RICKSHAW' ? 2.45 : 2.25, 0.12);
  root.add(hpBarBg, hpBarFill);

  return {
    root,
    bodyPivot,
    leftLeg,
    rightLeg,
    weaponArm,
    shieldMesh,
    wheels,
    telegraphBolt,
    hpBarBg,
    hpBarFill,
    laserBeam,
    capeMesh,
    staggerRing,
    hitMaterials,
  };
}

export function updateEnemyRig(rig: EnemyRig, e: EnemyEntity, time: number): void {
  const hover = e.type === 'DESI_SUPERMAN' && e.state !== 'BOSS_STAGGER' ? Math.sin(time * 4) * 0.18 : 0;
  rig.root.position.set(e.x * WORLD_SCALE, e.y * WORLD_SCALE + hover, 0);
  rig.bodyPivot.rotation.y = e.facing === 1 ? 0 : Math.PI;

  const stride = Math.abs(e.vx) > 15 ? Math.sin(e.animPhase) * 0.62 : 0;
  if (rig.leftLeg && rig.rightLeg) {
    rig.leftLeg.rotation.z = stride;
    rig.rightLeg.rotation.z = -stride;
  }
  if (rig.weaponArm) {
    rig.weaponArm.rotation.z =
      e.state === 'WINDUP' ? 2.3 : e.state === 'ATTACK' ? 0.95 : -stride * 0.4;
  }
  if (rig.shieldMesh) {
    rig.shieldMesh.visible = e.hasShield && !e.shieldBroken;
  }
  if (rig.wheels) {
    for (const w of rig.wheels) {
      w.rotation.z = -e.wheelAngle;
    }
  }
  if (rig.capeMesh) {
    rig.capeMesh.rotation.z = Math.sin(time * 8) * 0.12;
  }

  // Telegraph Counter Lightning
  const showBolt = e.telegraphTimer > 0 && (e.state === 'WINDUP' || e.state === 'BOSS_SLAM');
  rig.telegraphBolt.visible = showBolt;
  if (showBolt) {
    const sc = 1 + Math.sin(time * 32) * 0.22;
    rig.telegraphBolt.scale.setScalar(sc);
  }

  // Hit flash / smoke-blind tint
  for (const m of rig.hitMaterials) {
    if (e.hitFlash > 0) {
      m.emissive.setHex(0xffffff);
      m.emissiveIntensity = 0.85;
    } else if (e.state === 'SMOKE_BLIND') {
      m.emissive.setHex(0xdc2626);
      m.emissiveIntensity = 0.45;
    } else {
      m.emissive.setHex(e.type === 'DESI_SUPERMAN' ? 0x1d4ed8 : 0x000000);
      m.emissiveIntensity = e.type === 'DESI_SUPERMAN' ? 0.28 : 0;
    }
  }

  // Desi Superman 3D Heat-Vision Laser Orientation
  if (rig.laserBeam) {
    rig.laserBeam.visible = e.laserActive;
    if (e.laserActive) {
      // Note: In 2D canvas, +Y was down so laserAngle had positive downward; in Three.js +Y is up -> negate angle
      rig.laserBeam.rotation.z = -e.laserAngle;
    }
  }
  if (rig.staggerRing) {
    rig.staggerRing.visible = e.state === 'BOSS_STAGGER';
    if (e.state === 'BOSS_STAGGER') {
      rig.staggerRing.scale.setScalar(1 + Math.sin(time * 12) * 0.12);
    }
  }

  // HP Bar (hidden for Desi Superman who uses top Boss Bar)
  const showHp = e.type !== 'DESI_SUPERMAN' && e.hp < e.maxHp;
  rig.hpBarBg.visible = showHp;
  rig.hpBarFill.visible = showHp;
  if (showHp) {
    rig.hpBarFill.scale.x = Math.max(0.01, e.hp / e.maxHp);
  }
}

export function createVillageKidRig(kid: VillageKid): VillageKidRig {
  const root = new THREE.Group();
  const tunicMat = new THREE.MeshStandardMaterial({ color: kid.tunicColor, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xb77f58, roughness: 0.7 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.45, 8), tunicMat);
  body.position.set(0, 0.72, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinMat);
  head.position.set(0, 1.06, 0);
  root.add(body, head);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(0, 0.5, 0.08);
  const lm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.48, 6), darkMat);
  lm.position.y = -0.24;
  leftLeg.add(lm);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0, 0.5, -0.08);
  const rm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.48, 6), darkMat);
  rm.position.y = -0.24;
  rightLeg.add(rm);
  root.add(leftLeg, rightLeg);

  // Rolling Rubber Tire & Wooden Stick (Danda-Tyre)
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.065, 8, 16), darkMat);
  tire.position.set(0.64, 0.28, 0);
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.72, 6),
    new THREE.MeshStandardMaterial({ color: 0x926c44, roughness: 0.9 })
  );
  stick.rotation.z = -0.95;
  stick.position.set(0.34, 0.56, 0.06);
  root.add(tire, stick);

  root.scale.setScalar(kid.scale);
  return { root, leftLeg, rightLeg, tire };
}

export function createLanternMesh(): THREE.Group {
  const g = new THREE.Group();
  const rope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 1.2, 6),
    new THREE.MeshStandardMaterial({ color: 0xa17e52, roughness: 0.9 })
  );
  rope.position.y = 0.68;
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.22, 0.14, 8),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.7, roughness: 0.4 })
  );
  cap.position.y = 0.16;
  const bulb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.11, 0.28, 10),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    })
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.018, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.55 })
  );
  g.add(rope, cap, bulb, ring);
  return g;
}

export function createSamosaMesh(): THREE.Group {
  const g = new THREE.Group();
  const samosa = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.34, 3),
    new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.55,
      roughness: 0.52,
    })
  );
  samosa.position.y = 0.34;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.02, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0xfde047 })
  );
  ring.rotation.x = Math.PI * 0.5;
  ring.position.y = 0.08;
  g.add(samosa, ring);
  return g;
}
