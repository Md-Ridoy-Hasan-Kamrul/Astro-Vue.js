<script setup lang="ts">
/**
 * VolumetricStudio — Vue port of alexperezcedeno/volumetric-studio
 * (CSS perspective room + Three.js volumetric spot beams — no React / R3F.)
 */
import { computed, onMounted, onUnmounted, ref, watch, type ComponentPublicInstance } from 'vue';
import * as THREE from 'three';

type BackWall = {
  tl: [number, number];
  tr: [number, number];
  br: [number, number];
  bl: [number, number];
};

const props = withDefaults(
  defineProps<{
    class?: string;
    lightColor?: string;
    spots?: number[];
    intensity?: number;
    vignette?: number;
  }>(),
  {
    class: '',
    lightColor: '230,240,255',
    spots: () => [35, 50, 65],
    intensity: 1,
    vignette: 0.55,
  },
);

const METAL_NOISE =
  'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%221.5%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")';
const GRAIN_NOISE =
  'url("data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22g%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23g)%22/%3E%3C/svg%3E")';

const backWall: BackWall = {
  tl: [22, 10],
  tr: [78, 10],
  br: [78, 70],
  bl: [22, 70],
};

const lightsOn = ref(false);
const isFlickering = ref(true);
const beamHosts = ref<(HTMLElement | null)[]>([]);

const rootClass = computed(() =>
  ['relative h-full min-h-150 w-full overflow-hidden bg-black font-sans', props.class]
    .filter(Boolean)
    .join(' '),
);

const lightOpacity = computed(() => (lightsOn.value ? props.intensity : 0));
const lightRgb = computed(() => `rgb(${props.lightColor})`);
const vignetteBg = computed(
  () =>
    `radial-gradient(ellipse 90% 80% at 50% 45%, transparent 55%, rgba(0,0,0,${props.vignette}) 100%)`,
);

function poly(pts: readonly (readonly [number, number])[]) {
  return `polygon(${pts.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

function setBeamHost(el: Element | ComponentPublicInstance | null, index: number) {
  beamHosts.value[index] = el instanceof HTMLElement ? el : null;
}

const { tl, tr, br, bl } = backWall;

const clipBack = poly([tl, tr, br, bl]);
const clipCeiling = poly([[0, 0], [100, 0], tr, tl]);
const clipLeft = poly([[0, 0], tl, bl, [0, 100]]);
const clipRight = poly([[100, 0], tr, br, [100, 100]]);
const clipFloor = poly([[0, 100], [100, 100], br, bl]);

const backSpots = computed(() =>
  props.spots
    .map(
      (x) =>
        `radial-gradient(ellipse 25% 40% at ${x}% 68%, rgba(${props.lightColor},0.15) 0%, transparent 70%)`,
    )
    .join(', '),
);
const floorSpots = computed(() =>
  props.spots
    .map(
      (x) =>
        `radial-gradient(ellipse 35% 30% at ${x}% 80%, rgba(${props.lightColor},0.06) 0%, transparent 60%)`,
    )
    .join(', '),
);

type BeamRuntime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  material: THREE.ShaderMaterial;
  frame: number;
  resize: () => void;
};

const beams: BeamRuntime[] = [];
let mounted = true;

const VOL_VERT = /* glsl */ `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const VOL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec3 vNormal;
void main() {
  float intensity = pow(max(0.0, 0.85 - abs(vNormal.x)), 1.6) * 0.55
    + pow(max(0.0, vNormal.y * 0.35 + 0.2), 2.0) * 0.35;
  gl_FragColor = vec4(uColor, clamp(intensity, 0.0, 1.0) * uOpacity);
}
`;

function createBeam(host: HTMLElement, color: string): BeamRuntime | null {
  const width = host.clientWidth || 200;
  const height = host.clientHeight || 400;
  if (width < 2 || height < 2) return null;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  host.replaceChildren(renderer.domElement);
  Object.assign(renderer.domElement.style, {
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none',
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
  camera.position.set(0, 0, 10);

  const colorThree = new THREE.Color(color);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: colorThree },
      uOpacity: { value: lightOpacity.value },
    },
    vertexShader: VOL_VERT,
    fragmentShader: VOL_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 9, 48, 1, true), material);
  cone.position.set(0, -0.4, 0);
  cone.rotation.x = Math.PI;
  scene.add(cone);

  const core = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 9, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: colorThree,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  core.position.copy(cone.position);
  core.rotation.copy(cone.rotation);
  scene.add(core);

  const resize = () => {
    const w = host.clientWidth || 200;
    const h = host.clientHeight || 400;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };

  const tick = () => {
    material.uniforms.uOpacity.value = lightOpacity.value;
    renderer.render(scene, camera);
    runtime.frame = requestAnimationFrame(tick);
  };

  const runtime: BeamRuntime = { renderer, scene, camera, material, frame: 0, resize };
  runtime.frame = requestAnimationFrame(tick);
  return runtime;
}

function disposeBeams() {
  for (const beam of beams) {
    cancelAnimationFrame(beam.frame);
    beam.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    beam.renderer.dispose();
    beam.renderer.domElement.remove();
  }
  beams.length = 0;
}

function mountBeams() {
  disposeBeams();
  for (const host of beamHosts.value) {
    if (!host) continue;
    const beam = createBeam(host, lightRgb.value);
    if (beam) beams.push(beam);
  }
}

function onResize() {
  for (const beam of beams) beam.resize();
}

async function runFlicker() {
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  await sleep(600);
  if (!mounted) return;
  const pulses: [boolean, number][] = [
    [true, 100],
    [false, 300],
    [true, 50],
    [false, 200],
    [true, 40],
    [false, 60],
    [true, 40],
    [false, 400],
  ];
  for (const [on, wait] of pulses) {
    if (!mounted) return;
    lightsOn.value = on;
    await sleep(wait);
  }
  if (!mounted) return;
  isFlickering.value = false;
  lightsOn.value = true;
}

onMounted(() => {
  mounted = true;
  requestAnimationFrame(() => {
    mountBeams();
    void runFlicker();
  });
  window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  mounted = false;
  window.removeEventListener('resize', onResize);
  disposeBeams();
});

watch(
  () => props.spots.join(','),
  () => {
    requestAnimationFrame(mountBeams);
  },
);
</script>

<template>
  <section :class="rootClass">
    <!-- Perspective room -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
      <div
        class="absolute inset-0"
        :style="{
          clipPath: clipBack,
          background: 'linear-gradient(to bottom, rgba(20,20,22,1) 0%, rgba(8,8,10,1) 100%)',
        }"
      />
      <div
        class="absolute inset-0"
        :style="{
          clipPath: clipCeiling,
          background: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 100%)',
        }"
      />
      <div
        class="absolute inset-0"
        :style="{
          clipPath: clipLeft,
          background:
            'linear-gradient(to right, rgba(8,8,10,1) 0%, rgba(18,18,20,1) 70%, rgba(26,26,28,1) 100%)',
        }"
      />
      <div
        class="absolute inset-0"
        :style="{
          clipPath: clipRight,
          background:
            'linear-gradient(to left, rgba(8,8,10,1) 0%, rgba(18,18,20,1) 70%, rgba(26,26,28,1) 100%)',
        }"
      />
      <div
        class="absolute inset-0"
        :style="{
          clipPath: clipFloor,
          background: 'linear-gradient(to top, rgba(15,15,17,1) 0%, rgba(6,6,8,1) 100%)',
        }"
      />

      <svg class="absolute inset-0 z-10 h-full w-full">
        <defs>
          <linearGradient id="vs-baseGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="white" stop-opacity="0" />
            <stop offset="20%" stop-color="white" stop-opacity="0.5" />
            <stop offset="80%" stop-color="white" stop-opacity="0.5" />
            <stop offset="100%" stop-color="white" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="vs-vGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="white" stop-opacity="0" />
            <stop offset="50%" stop-color="white" stop-opacity="0.18" />
            <stop offset="100%" stop-color="white" stop-opacity="0" />
          </linearGradient>
        </defs>
        <line
          :x1="`${bl[0]}%`"
          :y1="`${bl[1]}%`"
          :x2="`${br[0]}%`"
          :y2="`${br[1]}%`"
          stroke="rgba(255,255,255,0.2)"
          stroke-width="5"
          style="filter: blur(3px)"
        />
        <line
          :x1="`${bl[0]}%`"
          :y1="`${bl[1]}%`"
          :x2="`${br[0]}%`"
          :y2="`${br[1]}%`"
          stroke="url(#vs-baseGrad)"
          stroke-width="1"
        />
        <line
          :x1="`${tl[0]}%`"
          :y1="`${tl[1]}%`"
          :x2="`${bl[0]}%`"
          :y2="`${bl[1]}%`"
          stroke="url(#vs-vGrad)"
          stroke-width="1"
        />
        <line
          :x1="`${tr[0]}%`"
          :y1="`${tr[1]}%`"
          :x2="`${br[0]}%`"
          :y2="`${br[1]}%`"
          stroke="url(#vs-vGrad)"
          stroke-width="1"
        />
      </svg>

      <!-- Soft wall washes -->
      <div
        class="pointer-events-none absolute inset-0 z-15 mix-blend-screen"
        :style="{
          opacity: lightOpacity,
          transition: isFlickering ? 'none' : 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'opacity',
        }"
      >
        <div class="absolute inset-0" :style="{ clipPath: clipBack, background: backSpots }" />
        <div
          class="absolute inset-0"
          :style="{
            clipPath: clipLeft,
            background: `radial-gradient(ellipse 40% 50% at 15% 75%, rgba(${lightColor},0.08) 0%, transparent 60%)`,
          }"
        />
        <div
          class="absolute inset-0"
          :style="{
            clipPath: clipRight,
            background: `radial-gradient(ellipse 40% 50% at 85% 75%, rgba(${lightColor},0.08) 0%, transparent 60%)`,
          }"
        />
        <div class="absolute inset-0" :style="{ clipPath: clipFloor, background: floorSpots }" />
      </div>

      <!-- Volumetric beams (Three.js) -->
      <div class="pointer-events-none absolute inset-0 z-16 mix-blend-screen">
        <div
          v-for="(pos, i) in spots"
          :key="`beam-${pos}`"
          class="pointer-events-none absolute flex h-[80vh] w-50 -translate-x-1/2 justify-center"
          :style="{
            left: `${pos}%`,
            top: 'calc(3% + 80px)',
            opacity: lightOpacity,
            transition: isFlickering
              ? 'none'
              : `opacity 800ms ease-in-out ${i * 100}ms`,
            willChange: 'opacity',
            mixBlendMode: 'screen',
          }"
        >
          <div :ref="(el) => setBeamHost(el, i)" class="h-full w-full" />
        </div>
      </div>

      <!-- Physical fixtures -->
      <div class="pointer-events-none absolute inset-0 z-31">
        <div
          v-for="pos in spots"
          :key="`fixture-${pos}`"
          class="absolute flex flex-col items-center"
          :style="{ left: `${pos}%`, top: '3%', transform: 'translate(-50%, -4px)' }"
        >
          <div
            class="relative h-8.5 w-3.5 overflow-hidden rounded-sm border border-zinc-900 shadow-[0_5px_10px_rgba(0,0,0,0.9),inset_0_0_4px_rgba(255,255,255,0.5)]"
            style="background: linear-gradient(to right, #666 0%, #ffffff 40%, #999 60%, #333 100%)"
          >
            <div
              class="absolute top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-900 shadow-[inset_0_1px_1px_rgba(0,0,0,1)]"
            />
            <div
              class="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-900 shadow-[inset_0_1px_1px_rgba(0,0,0,1)]"
            />
          </div>
          <div
            class="relative h-4.5 w-2 border-x border-black bg-linear-to-r from-zinc-900 via-zinc-600 to-zinc-950"
          >
            <div
              class="absolute -bottom-2 left-1/2 h-4.5 w-4.5 -translate-x-1/2 rounded-full border border-zinc-900 shadow-[0_4px_8px_rgba(0,0,0,1),inset_0_1px_2px_rgba(255,255,255,0.3)]"
              style="background: radial-gradient(circle at top left, #777, #111)"
            />
          </div>
          <div class="relative mt-1.5 flex h-16 w-13.5 justify-center perspective-[400px]">
            <div
              class="absolute inset-0 flex flex-col justify-evenly overflow-hidden rounded-t-sm rounded-b-2xl border border-black shadow-[0_20px_30px_rgba(0,0,0,0.9)]"
              style="background: linear-gradient(to right, #111 0%, #3a3a3a 30%, #555 50%, #2a2a2a 80%, #000 100%)"
            >
              <div
                class="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay"
                :style="{ backgroundImage: METAL_NOISE }"
              />
              <div
                v-for="n in 4"
                :key="n"
                class="z-10 h-0.5 w-full bg-black/90 shadow-[0_1px_0_rgba(255,255,255,0.15)]"
              />
            </div>
            <div
              class="absolute -bottom-1.5 z-10 flex h-4.5 w-14.5 items-center justify-center overflow-hidden rounded-[50%] border-2 border-zinc-900 shadow-[0_10px_15px_rgba(0,0,0,1)]"
              style="background: radial-gradient(ellipse at center, #222, #000)"
            >
              <div
                class="h-2.5 w-8.5 rounded-[50%] transition-all duration-700"
                :style="{
                  background: lightsOn ? '#ffffff' : '#111',
                  boxShadow: lightsOn
                    ? '0 0 20px 8px rgba(255,255,255,0.9), inset 0 0 8px #fff'
                    : 'inset 0 2px 5px rgba(0,0,0,0.9), inset 0 -1px 1px rgba(255,255,255,0.05)',
                }"
              />
            </div>
            <div
              class="absolute -bottom-4.5 z-20 flex h-5 w-11.5 origin-top justify-center border border-black shadow-[0_15px_15px_rgba(0,0,0,0.8)]"
              style="
                transform: rotateX(-45deg);
                background: linear-gradient(to bottom, #222, #050505);
              "
            >
              <div class="h-full w-[80%] bg-white/3" />
            </div>
            <div
              class="absolute bottom-1.5 z-0 h-5 w-11.5 origin-bottom border border-black"
              style="transform: rotateX(45deg); background: linear-gradient(to top, #111, #000)"
            />
            <div
              class="absolute -bottom-1.5 -left-1.5 z-10 h-5.5 w-3.5 origin-right border border-black bg-zinc-900 shadow-[5px_0_10px_rgba(0,0,0,0.5)]"
              style="transform: rotateY(-55deg) skewY(15deg)"
            />
            <div
              class="absolute -right-1.5 -bottom-1.5 z-10 h-5.5 w-3.5 origin-left border border-black bg-zinc-900 shadow-[-5px_0_10px_rgba(0,0,0,0.5)]"
              style="transform: rotateY(55deg) skewY(-15deg)"
            />
          </div>
        </div>
      </div>

      <div
        class="pointer-events-none absolute top-[4%] left-0 z-29 h-20 w-full bg-linear-to-b from-black/60 to-transparent blur-xl"
      />

      <div class="pointer-events-none absolute inset-0 z-30" :style="{ clipPath: clipCeiling }">
        <div
          class="absolute top-[3%] left-0 h-6.5 w-full"
          style="
            background: linear-gradient(to bottom, #111 0%, #3a3a3a 30%, #555 50%, #2a2a2a 80%, #000 100%);
            box-shadow:
              inset 0 1px 1px rgba(255, 255, 255, 0.15),
              inset 0 -1px 2px rgba(0, 0, 0, 0.9),
              0 10px 20px -5px rgba(0, 0, 0, 0.8);
          "
        >
          <div
            class="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay"
            :style="{ backgroundImage: METAL_NOISE }"
          />
        </div>
      </div>

      <div class="absolute inset-0 z-20" :style="{ background: vignetteBg }" />
      <div
        class="pointer-events-none absolute inset-0 z-25 opacity-[0.04] mix-blend-screen"
        :style="{ backgroundImage: GRAIN_NOISE, backgroundSize: '256px 256px' }"
      />
    </div>

    <div class="pointer-events-none relative z-10 h-full w-full">
      <slot />
    </div>
  </section>
</template>
