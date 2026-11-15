/**
 * Visor 3D del personaje (VRM) para Persona IA.
 *
 * Se compila con esbuild a un unico bundle IIFE y se inyecta en un WebView.
 * Recibe el VRM por trozos en base64 desde React Native y expone una API
 * global `PersonaViewer` para cambiar emociones, hablar, etc.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

type EmotionName =
  | 'neutral'
  | 'feliz'
  | 'triste'
  | 'enfadado'
  | 'sorprendida'
  | 'pensativa'
  | 'timida'
  | 'carinosa'
  | 'aburrida'
  | 'emocionada';

interface EmotionPreset {
  /** Expresiones VRM y su peso objetivo. */
  expr: Record<string, number>;
  /** Inclinacion de cabeza (radianes). */
  head: [number, number, number];
  /** Rotacion de hombros/brazos. */
  arms: number;
  /** Inclinacion del torso. */
  spine: number;
}

const EMOTIONS: Record<EmotionName, EmotionPreset> = {
  neutral: { expr: {}, head: [0, 0, 0], arms: 0, spine: 0 },
  feliz: {
    expr: { happy: 0.95 },
    head: [-0.04, 0, 0.03],
    arms: 0.05,
    spine: -0.02,
  },
  triste: {
    expr: { sad: 0.9 },
    head: [0.13, 0, -0.02],
    arms: -0.09,
    spine: 0.05,
  },
  enfadado: {
    expr: { angry: 0.9 },
    head: [-0.02, 0, 0],
    arms: 0.02,
    spine: -0.03,
  },
  sorprendida: {
    expr: { surprised: 0.95 },
    head: [-0.09, 0, 0],
    arms: 0.08,
    spine: -0.05,
  },
  pensativa: {
    expr: { relaxed: 0.55, sad: 0.12 },
    head: [0.05, 0.16, 0.09],
    arms: -0.03,
    spine: 0.02,
  },
  timida: {
    expr: { happy: 0.4, sad: 0.22 },
    head: [0.1, -0.14, 0.05],
    arms: -0.06,
    spine: 0.04,
  },
  carinosa: {
    expr: { happy: 0.7, relaxed: 0.45 },
    head: [-0.03, 0.05, 0.07],
    arms: 0.03,
    spine: -0.01,
  },
  aburrida: {
    expr: { relaxed: 0.7, sad: 0.18 },
    head: [0.07, -0.05, -0.04],
    arms: -0.05,
    spine: 0.03,
  },
  emocionada: {
    expr: { happy: 1.0, surprised: 0.35 },
    head: [-0.07, 0, 0.02],
    arms: 0.1,
    spine: -0.04,
  },
};

const VISEMES = ['aa', 'ih', 'ou', 'ee', 'oh'];

/** Rotacion Z de reposo de los brazos (salen de la T-pose del VRM). */
const REST_ARM_Z_L = 1.22;
const REST_ARM_Z_R = -1.22;

// ---------------------------------------------------------------- estado

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let clock: THREE.Clock;
let vrm: any = null;
let raf = 0;

let currentEmotion: EmotionName = 'neutral';
let targetEmotion: EmotionName = 'neutral';
let emotionBlend = 1; // 0..1 progreso de la transicion
let fromExpr: Record<string, number> = {};
let toExpr: Record<string, number> = {};

let speaking = false;
let speakEnergy = 0;
let mouthOpen = 0;
let currentViseme = 0;
let visemeTimer = 0;

let blinkValue = 0;
let nextBlink = 1.5;
let blinkPhase = -1; // -1 = inactivo

let headNoise = { x: 0, y: 0, z: 0 };
let headNoiseTarget = { x: 0, y: 0, z: 0 };
let headNoiseTimer = 0;

let lookTarget = { x: 0, y: 0 };
let lookCurrent = { x: 0, y: 0 };

let time = 0;
let ready = false;

// ---------------------------------------------------------------- utilidades

function post(msg: any) {
  try {
    const s = JSON.stringify(msg);
    // @ts-ignore — WebView de React Native
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(s);
      return;
    }
    // navegador: el visor vive dentro de un iframe
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(s, '*');
    }
  } catch (e) {
    /* noop */
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// ---------------------------------------------------------------- escena

function initScene() {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const w = window.innerWidth;
  const h = window.innerHeight;

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 20);
  camera.position.set(0, 1.32, 2.35);
  camera.lookAt(0, 1.28, 0);

  // Iluminacion: clave fria, relleno purpura, contraluz cian (estilo futurista)
  const key = new THREE.DirectionalLight(0xdfe9ff, 1.15);
  key.position.set(1.4, 2.6, 2.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8b5cf6, 0.55);
  fill.position.set(-2.2, 1.4, 1.2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0x22d3ee, 1.1);
  rim.position.set(-0.6, 1.9, -2.4);
  scene.add(rim);

  const rim2 = new THREE.DirectionalLight(0xa855f7, 0.7);
  rim2.position.set(1.8, 1.2, -2.0);
  scene.add(rim2);

  scene.add(new THREE.AmbientLight(0x6b5fa8, 0.55));
  scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x1a1030, 0.45));

  clock = new THREE.Clock();

  window.addEventListener('resize', onResize);
}

function onResize() {
  if (!renderer) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// ---------------------------------------------------------------- carga VRM

let vrmChunks: string[] = [];
let vrmTotal = 0;

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Baja los brazos de la T-pose en la que vienen los VRM de VRoid.
 * Se aplica una sola vez al cargar; luego la animacion solo suma pequenas
 * variaciones encima de esta pose base.
 */
function applyRestPose() {
  if (!vrm || !vrm.humanoid) return;

  const set = (bone: string, x: number, y: number, z: number) => {
    const n = vrm.humanoid.getNormalizedBoneNode(bone);
    if (n) n.rotation.set(x, y, z);
  };

  // brazos hacia abajo, ligeramente separados del cuerpo
  set('leftUpperArm', 0.06, 0.0, REST_ARM_Z_L);
  set('rightUpperArm', 0.06, 0.0, REST_ARM_Z_R);
  set('leftLowerArm', 0.0, 0.0, 0.16);
  set('rightLowerArm', 0.0, 0.0, -0.16);
  set('leftHand', 0.0, 0.0, 0.06);
  set('rightHand', 0.0, 0.0, -0.06);

  // hombros relajados
  set('leftShoulder', 0.0, 0.0, -0.04);
  set('rightShoulder', 0.0, 0.0, 0.04);

  // piernas rectas y juntas
  set('leftUpperLeg', 0.0, 0.0, 0.02);
  set('rightUpperLeg', 0.0, 0.0, -0.02);
}

function loadVRM(buffer: ArrayBuffer) {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  loader.parse(
    buffer,
    '',
    (gltf) => {
      const model = gltf.userData.vrm;
      if (!model) {
        post({ type: 'error', message: 'El archivo no contiene un VRM valido' });
        return;
      }

      // Optimizaciones de three-vrm
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);
      VRMUtils.combineMorphs(model);

      // VRM 0.x mira hacia -Z. rotateVRM0 gira la escena 180 grados para que
      // el personaje encare la camara; en VRM 1.0 no hace nada.
      VRMUtils.rotateVRM0(model);

      model.scene.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.frustumCulled = false;
          obj.castShadow = false;
          obj.receiveShadow = false;

          // MToon (el shader de VRM) se renderiza negro con esta version de
          // three, asi que convertimos a MeshStandardMaterial conservando la
          // textura y el color base. El resultado es un look limpio y bien
          // iluminado, coherente con el estilo de la app.
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          const converted = mats.map((m: any) => {
            if (!m) return m;
            const std = new THREE.MeshStandardMaterial({
              map: m.map || null,
              color: m.color ? m.color.clone() : new THREE.Color(0xffffff),
              transparent: !!m.transparent,
              opacity: typeof m.opacity === 'number' ? m.opacity : 1,
              alphaTest: m.alphaTest || 0,
              side: m.side ?? THREE.FrontSide,
              roughness: 0.78,
              metalness: 0.0,
              depthWrite: m.depthWrite !== false,
            });
            if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
            if (std.map) std.map.anisotropy = 4;
            return std;
          });
          obj.material = Array.isArray(obj.material) ? converted : converted[0];
        }
      });

      scene.add(model.scene);
      vrm = model;

      // Pose de reposo: bajar los brazos de la T-pose del VRM
      applyRestPose();

      // Encuadre: cabeza y torso visibles
      const box = new THREE.Box3().setFromObject(model.scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const headY = box.max.y;
      const height = size.y;

      // Encuadrar desde la cabeza hasta media cintura
      const focusY = headY - height * 0.16;
      camera.position.set(0, focusY + height * 0.02, height * 0.62);
      camera.lookAt(0, focusY, 0);
      camera.updateProjectionMatrix();

      ready = true;
      post({ type: 'ready', height, headY });
      animate();
    },
    (err) => {
      post({ type: 'error', message: String(err && err.message ? err.message : err) });
    }
  );
}

// ---------------------------------------------------------------- animacion

function applyEmotion(dt: number) {
  if (!vrm || !vrm.expressionManager) return;

  if (emotionBlend < 1) {
    emotionBlend = Math.min(1, emotionBlend + dt / 0.45);
    const t = easeInOut(emotionBlend);
    const keys = new Set([...Object.keys(fromExpr), ...Object.keys(toExpr)]);
    for (const k of keys) {
      const a = fromExpr[k] || 0;
      const b = toExpr[k] || 0;
      vrm.expressionManager.setValue(k, lerp(a, b, t));
    }
  }
}

function updateBlink(dt: number) {
  if (!vrm || !vrm.expressionManager) return;

  if (blinkPhase < 0) {
    nextBlink -= dt;
    if (nextBlink <= 0) {
      blinkPhase = 0;
      nextBlink = rand(2.2, 5.5);
    }
  } else {
    blinkPhase += dt;
    const dur = 0.16;
    if (blinkPhase < dur) {
      const t = blinkPhase / dur;
      // cierre rapido, apertura mas lenta
      blinkValue = t < 0.45 ? t / 0.45 : 1 - (t - 0.45) / 0.55;
    } else {
      blinkValue = 0;
      blinkPhase = -1;
    }
  }
  vrm.expressionManager.setValue('blink', blinkValue);
}

function updateMouth(dt: number) {
  if (!vrm || !vrm.expressionManager) return;

  if (speaking) {
    // Envolvente de voz sintetica: pulsos irregulares que parecen habla
    speakEnergy = lerp(speakEnergy, 1, dt * 6);
    visemeTimer -= dt;
    if (visemeTimer <= 0) {
      visemeTimer = rand(0.07, 0.15);
      currentViseme = Math.floor(Math.random() * VISEMES.length);
      mouthOpen = rand(0.35, 1.0);
    }
    // micro-variacion continua
    mouthOpen = Math.max(0.12, mouthOpen * (0.86 + Math.random() * 0.28));
  } else {
    speakEnergy = lerp(speakEnergy, 0, dt * 8);
    mouthOpen = lerp(mouthOpen, 0, dt * 12);
  }

  for (let i = 0; i < VISEMES.length; i++) {
    const target = i === currentViseme ? mouthOpen * speakEnergy : 0;
    const cur = vrm.expressionManager.getValue(VISEMES[i]) || 0;
    vrm.expressionManager.setValue(VISEMES[i], lerp(cur, target, dt * 18));
  }
}

function updateHead(dt: number) {
  if (!vrm || !vrm.humanoid) return;

  const preset = EMOTIONS[targetEmotion];

  // Deriva organica de la cabeza
  headNoiseTimer -= dt;
  if (headNoiseTimer <= 0) {
    headNoiseTimer = rand(1.6, 3.4);
    headNoiseTarget = {
      x: rand(-0.035, 0.035),
      y: rand(-0.07, 0.07),
      z: rand(-0.03, 0.03),
    };
  }
  headNoise.x = lerp(headNoise.x, headNoiseTarget.x, dt * 1.6);
  headNoise.y = lerp(headNoise.y, headNoiseTarget.y, dt * 1.6);
  headNoise.z = lerp(headNoise.z, headNoiseTarget.z, dt * 1.6);

  // Mirada: sigue ligeramente al usuario, con micro-movimientos
  lookCurrent.x = lerp(lookCurrent.x, lookTarget.x, dt * 3);
  lookCurrent.y = lerp(lookCurrent.y, lookTarget.y, dt * 3);

  const head = vrm.humanoid.getNormalizedBoneNode('head');
  if (head) {
    head.rotation.x = preset.head[0] + headNoise.x + Math.sin(time * 0.7) * 0.008;
    head.rotation.y = preset.head[1] + headNoise.y + lookCurrent.x * 0.12;
    head.rotation.z = preset.head[2] + headNoise.z;
  }

  const neck = vrm.humanoid.getNormalizedBoneNode('neck');
  if (neck) {
    neck.rotation.x = preset.head[0] * 0.35 + headNoise.x * 0.4;
    neck.rotation.y = preset.head[1] * 0.3 + headNoise.y * 0.4;
  }

  // Respiracion: pecho y hombros
  const breath = Math.sin(time * 1.35);
  const chest = vrm.humanoid.getNormalizedBoneNode('chest');
  if (chest) {
    chest.rotation.x = preset.spine + breath * 0.012;
  }
  const spine = vrm.humanoid.getNormalizedBoneNode('spine');
  if (spine) {
    spine.rotation.x = preset.spine * 0.6 + breath * 0.008;
    spine.rotation.z = Math.sin(time * 0.55) * 0.006;
  }

  const upperArmL = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
  const upperArmR = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
  if (upperArmL) {
    upperArmL.rotation.z = REST_ARM_Z_L - preset.arms + breath * 0.01;
    upperArmL.rotation.x = 0.06 + Math.sin(time * 0.8) * 0.012;
  }
  if (upperArmR) {
    upperArmR.rotation.z = REST_ARM_Z_R + preset.arms - breath * 0.01;
    upperArmR.rotation.x = 0.06 + Math.sin(time * 0.8 + 1.2) * 0.012;
  }

  // Ojos: mirar arriba/abajo segun emocion
  if (vrm.lookAt) {
    vrm.lookAt.target = null;
    vrm.lookAt.applier = vrm.lookAt.applier || null;
  }
}

function animate() {
  raf = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;

  if (vrm) {
    applyEmotion(dt);
    updateBlink(dt);
    updateMouth(dt);
    updateHead(dt);
    vrm.update(dt);
  }

  if (renderer) renderer.render(scene, camera);
}

// ---------------------------------------------------------------- API global

const api = {
  /** Recibe un trozo del VRM en base64. */
  chunk(index: number, total: number, data: string) {
    vrmTotal = total;
    vrmChunks[index] = data;
    if (vrmChunks.filter(Boolean).length === total) {
      const joined = vrmChunks.join('');
      vrmChunks = [];
      try {
        loadVRM(b64ToArrayBuffer(joined));
      } catch (e: any) {
        post({ type: 'error', message: String(e && e.message ? e.message : e) });
      }
    }
  },

  setEmotion(name: string) {
    const next = (EMOTIONS[name as EmotionName] ? name : 'neutral') as EmotionName;
    if (next === targetEmotion) return;
    // capturar el estado actual como punto de partida
    fromExpr = {};
    if (vrm && vrm.expressionManager) {
      for (const k of Object.keys(EMOTIONS[targetEmotion].expr)) {
        fromExpr[k] = vrm.expressionManager.getValue(k) || 0;
      }
    }
    toExpr = { ...EMOTIONS[next].expr };
    targetEmotion = next;
    currentEmotion = next;
    emotionBlend = 0;
  },

  setSpeaking(on: boolean) {
    speaking = !!on;
    if (!on) {
      mouthOpen = 0;
      speakEnergy = 0;
    }
  },

  /** Nivel de voz 0..1 (opcional, para lip-sync real). */
  setLevel(level: number) {
    if (speaking) {
      mouthOpen = Math.max(0.1, Math.min(1, level));
    }
  },

  look(x: number, y: number) {
    lookTarget.x = Math.max(-1, Math.min(1, x));
    lookTarget.y = Math.max(-1, Math.min(1, y));
  },

  /** Ajusta el encuadre: 0 = plano medio, 1 = primer plano. */
  zoom(z: number) {
    if (!vrm) return;
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const size = box.getSize(new THREE.Vector3());
    const headY = box.max.y;
    const height = size.y;
    const focusY = headY - height * (0.16 - z * 0.06);
    camera.position.set(0, focusY + height * 0.02, height * (0.62 - z * 0.16));
    camera.lookAt(0, focusY, 0);
    camera.updateProjectionMatrix();
  },

  isReady() {
    return ready;
  },
};

// @ts-ignore
window.PersonaViewer = api;

// ---------------------------------------------------------------- arranque

window.addEventListener('load', () => {
  try {
    initScene();
    post({ type: 'booted' });
  } catch (e: any) {
    post({ type: 'error', message: 'init: ' + String(e && e.message ? e.message : e) });
  }
});
