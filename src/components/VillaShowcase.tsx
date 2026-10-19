import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DUR, EASE, VIEWPORT } from '../motion/tokens.ts';
import { Reveal } from '../motion/Reveal.tsx';
import type * as THREE from 'three';
import { MaskedHeading } from '../motion/MaskedHeading.tsx';

const MODEL_URL = '/models/LuxuryVilla_site_draco.glb';

/**
 * Persistent 3D Viewer Singleton
 *
 * The Three.js WebGLRenderer, Scene, Camera, Controls, and Draco Model
 * are instantiated once and kept alive permanently.
 *
 * - No loading screens or spinners.
 * - Model is initialized immediately and visible from the start.
 * - Scene is kept alive across scrolls and returns without reloading or re-decoding.
 */
interface PersistentViewer {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: any; // OrbitControls
  model: any;
  domElement: HTMLCanvasElement;
  isReady: boolean;
  frameView: () => void;
  play: () => void;
  pause: () => void;
  resize: (width: number, height: number) => void;
  reset: () => void;
  setScrollProgress: (progress: number) => void;
  setUserInteracting: (interacting: boolean) => void;
  setPerfElement: (el: HTMLDivElement | null) => void;
  setOnInteract: (cb: (() => void) | null) => void;
}

let viewerSingleton: PersistentViewer | null = null;
let initViewerPromise: Promise<PersistentViewer> | null = null;

/**
 * Load progress for the on-screen loader. The villa is a 13 MB Draco model, so
 * on a first visit over mobile data it takes a few seconds to arrive; the
 * viewport shows real download progress over a still of the villa instead of
 * an empty dark box, and offers a retry if the download fails.
 */
const MODEL_BYTES = 13_702_856;
type LoadPhase = 'idle' | 'loading' | 'ready' | 'error';
let loadState: { phase: LoadPhase; progress: number } = { phase: 'idle', progress: 0 };
const loadListeners = new Set<() => void>();
function setLoad(phase: LoadPhase, progress: number) {
  if (loadState.phase === phase && Math.abs(loadState.progress - progress) < 0.01) return;
  loadState = { phase, progress };
  loadListeners.forEach((fn) => fn());
}
function useLoadState() {
  return useSyncExternalStore(
    (fn) => {
      loadListeners.add(fn);
      return () => loadListeners.delete(fn);
    },
    () => loadState,
    () => loadState,
  );
}

/**
 * Initialize or retrieve the persistent 3D viewer singleton.
 * Runs once per browser session.
 */
async function getOrInitViewer(mountElement?: HTMLElement | null): Promise<PersistentViewer> {
  if (viewerSingleton) {
    if (mountElement && !mountElement.contains(viewerSingleton.domElement)) {
      mountElement.appendChild(viewerSingleton.domElement);
      viewerSingleton.resize(mountElement.clientWidth, mountElement.clientHeight);
    }
    return viewerSingleton;
  }

  if (initViewerPromise) {
    const viewer = await initViewerPromise;
    if (mountElement && !mountElement.contains(viewer.domElement)) {
      mountElement.appendChild(viewer.domElement);
      viewer.resize(mountElement.clientWidth, mountElement.clientHeight);
    }
    return viewer;
  }

  initViewerPromise = (async () => {
    setLoad('loading', 0.03);
    const THREE = await import('three');
    const [
      { OrbitControls },
      { GLTFLoader },
      { DRACOLoader },
      { MeshoptDecoder },
      { RoomEnvironment }
    ] = await Promise.all([
      import('three/examples/jsm/controls/OrbitControls.js'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/loaders/DRACOLoader.js'),
      import('three/examples/jsm/libs/meshopt_decoder.module.js'),
      import('three/examples/jsm/environments/RoomEnvironment.js'),
    ]);

    // Variables declared upfront before any internal functions are invoked
    let isOverModel = false;
    let isDragging = false;
    let hasInteracted = false;
    let userInteracting = false;
    let lastInteractionTime = 0;
    let scrollProgress = 0;
    let perfEl: HTMLDivElement | null = null;
    let isPlaying = false;

    // The loop draws on demand: a frame is only submitted when the camera has
    // actually moved or something else asked for one. Sitting still in view then
    // costs nothing, which is what frees the main thread for the page scroll.
    let needsRender = true;
    const requestRender = () => {
      needsRender = true;
    };

    // Told to React the first time the user moves the model, so the "Reset view"
    // control can appear.
    let interactCb: (() => void) | null = null;
    let hasReportedInteraction = false;
    const onInteract = () => {
      if (hasReportedInteraction) return;
      hasReportedInteraction = true;
      interactCb?.();
    };

    // 1. Create WebGLRenderer ONCE
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
      stencil: false,
      depth: true,
    });

    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    const targetDpr = isMobile ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.35);
    renderer.setPixelRatio(targetDpr);
    renderer.setSize(
      mountElement?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200),
      mountElement?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight * 0.75 : 600)
    );

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping ?? THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;

    // Static shadow map configuration (autoUpdate = false to eliminate redundant draw calls)
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;

    const domElement = renderer.domElement;
    domElement.style.display = 'block';
    domElement.style.position = 'absolute';
    domElement.style.top = '0';
    domElement.style.left = '0';
    domElement.style.width = '100%';
    domElement.style.height = '100%';
    domElement.style.outline = 'none';

    // 2. Scene & Lighting Setup
    const scene = new THREE.Scene();
    scene.background = null;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.45;

    const key = new THREE.DirectionalLight(0xfff5eb, 1.15);
    key.position.set(32, 44, 22);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.02;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x768fa5, 0.35);
    rim.position.set(-28, 22, -26);
    scene.add(rim);

    const bounce = new THREE.DirectionalLight(0xf0e2cf, 0.25);
    bounce.position.set(-15, -8, 20);
    scene.add(bounce);

    const ambient = new THREE.AmbientLight(0x181a22, 0.45);
    scene.add(ambient);

    // Invisible shadow catcher ground plane
    const shadowPlaneGeo = new THREE.PlaneGeometry(500, 500);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.55 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // 3. Architectural Camera & Controls
    const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 2500);

    const controls = new OrbitControls(camera, domElement);
    controls.enabled = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.7;
    controls.enablePan = false;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controls.enableZoom = false; // Decoupled wheel zoom to protect webpage scrolling
    controls.enableRotate = false; // Only allow rotation when cursor is over the model
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;

    // OrbitControls' constructor stamps `touch-action: none` on the canvas, which
    // makes the whole 62-78svh viewport swallow vertical swipes and traps the page
    // on phones. `pan-y` hands plain vertical swipes back to the browser (so the
    // page scrolls over the empty parts of the canvas) while keeping horizontal
    // drags and two-finger gestures for us. Touches that land on the model itself
    // are claimed in the touchstart handler below.
    domElement.style.touchAction = 'pan-y';

    // 4. Load & Decode Draco GLB ONCE
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');

    const loader = new GLTFLoader()
      .setDRACOLoader(dracoLoader)
      .setMeshoptDecoder(MeshoptDecoder);

    setLoad('loading', 0.06);
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(
        MODEL_URL,
        resolve,
        (e: ProgressEvent) => {
          const total = e.lengthComputable && e.total ? e.total : MODEL_BYTES;
          setLoad('loading', 0.06 + 0.84 * Math.min(1, e.loaded / total));
        },
        reject,
      );
    });
    setLoad('loading', 0.93);

    const model = gltf.scene;

    const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    model.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = true;

        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat: any) => {
          if (!mat) return;
          mat.toneMapped = true;
          if (mat.map) mat.map.anisotropy = maxAniso;
          if (mat.normalMap) mat.normalMap.anisotropy = maxAniso;
          if (mat.roughnessMap) mat.roughnessMap.anisotropy = maxAniso;

          if (mat.transparent || (mat as THREE.MeshPhysicalMaterial).transmission > 0) {
            mat.depthWrite = true;
          }
        });
      }
    });

    // Compute bounding box, center model horizontally, align base at y = 0
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.x = -center.x;
    model.position.y = -box.min.y;
    model.position.z = -center.z;
    scene.add(model);

    const radius = Math.max(size.x, size.y, size.z) * 0.5;

    // Calibrate shadow camera
    const d = radius * 1.5;
    key.shadow.camera.left = -d;
    key.shadow.camera.right = d;
    key.shadow.camera.top = d;
    key.shadow.camera.bottom = -d;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = radius * 5;
    key.shadow.camera.updateProjectionMatrix();

    camera.near = radius / 100;
    camera.far = radius * 100;
    camera.updateProjectionMatrix();

    const targetY = size.y * 0.35;
    const _idealTarget = new THREE.Vector3(0, targetY, 0);
    controls.target.copy(_idealTarget);
    controls.minDistance = radius * 0.65;
    controls.maxDistance = radius * 3.5;

    const _heroCameraPos = new THREE.Vector3();
    const _entryCameraPos = new THREE.Vector3();
    const _idealPos = new THREE.Vector3();
    const _cameraOffset = new THREE.Vector3();

    const frameView = () => {
      const fov = (camera.fov * Math.PI) / 180;
      const aspect = camera.aspect;
      const fitH = radius / Math.sin(fov / 2);
      const fitW = radius / Math.sin(Math.atan(Math.tan(fov / 2) * aspect));
      const dist = Math.max(fitH, fitW) * 1.08;

      _heroCameraPos.set(dist * 0.65, dist * 0.42, dist * 0.72);
      _entryCameraPos.set(dist * 0.95, dist * 0.65, dist * 0.45);

      if (!userInteracting) {
        camera.position.copy(_heroCameraPos);
        controls.target.copy(_idealTarget);
        controls.update();
      }
    };
    frameView();

    // 5. Pre-compile shaders and bake shadows once
    try {
      await renderer.compileAsync(scene, camera);
    } catch {
      // Fallback if environment doesn't support compileAsync
    }
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);

    // 6. Raycast & Selective Hit-Testing
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const checkHit = (clientX: number, clientY: number) => {
      const rect = domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(model, true);
      return hits.length > 0;
    };

    // The hover test raycasts every mesh in the villa, so it is capped at one
    // per frame instead of one per pointermove event.
    let hoverRaf = 0;
    let hoverX = 0;
    let hoverY = 0;

    const runHoverTest = () => {
      hoverRaf = 0;
      isOverModel = checkHit(hoverX, hoverY);
      domElement.style.cursor = isOverModel ? 'grab' : 'default';
      controls.enableRotate = isOverModel;
    };

    domElement.addEventListener('pointermove', (e: PointerEvent) => {
      if (isDragging || e.pointerType === 'touch') return;
      hoverX = e.clientX;
      hoverY = e.clientY;
      if (hoverRaf) return;
      hoverRaf = requestAnimationFrame(runHoverTest);
    }, { passive: true });

    domElement.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // the touch handlers below own this
      const hit = checkHit(e.clientX, e.clientY);
      if (hit) {
        isDragging = true;
        hasInteracted = true;
        userInteracting = true;
        lastInteractionTime = Date.now();
        controls.autoRotate = false;
        controls.enableRotate = true;
        domElement.style.cursor = 'grabbing';
        onInteract();
      } else {
        isDragging = false;
        controls.enableRotate = false;
        domElement.style.cursor = 'default';
      }
    });

    window.addEventListener('pointerup', (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (isDragging) {
        isDragging = false;
        lastInteractionTime = Date.now();
      }
      if (isOverModel) {
        domElement.style.cursor = 'grab';
        controls.enableRotate = true;
      } else {
        domElement.style.cursor = 'default';
        controls.enableRotate = false;
      }
    });

    // ---- Touch: one finger orbits, two fingers pinch-zoom ----
    //
    // A gesture only belongs to the model if its first touch actually lands on
    // the villa (a real raycast, not a full-bleed overlay). When it does, the
    // touchstart is cancelled, which hands the whole gesture to us and stops the
    // page scrolling underneath. When it misses, we do nothing at all and the
    // browser scrolls the page natively, exactly as it does elsewhere.
    //
    // Rather than routing through OrbitControls' touch path — which is all or
    // nothing with `touch-action` — the gesture writes to a spherical target and
    // the render loop eases the camera toward it, so the model never jumps and
    // never shakes however jittery the raw touch stream is.
    const _sphNow = new THREE.Spherical();
    const _sphTarget = new THREE.Spherical();
    const _sphOffset = new THREE.Vector3();
    const _sphReadout = new THREE.Spherical(); // telemetry only, kept allocation-free

    let touchMode: 'none' | 'orbit' | 'pinch' = 'none';
    let touchOwnsCamera = false;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let pinchStartDist = 0;
    let pinchStartRadius = 0;

    const clampSphericalTarget = () => {
      _sphTarget.phi = THREE.MathUtils.clamp(
        _sphTarget.phi,
        controls.minPolarAngle,
        controls.maxPolarAngle
      );
      _sphTarget.radius = THREE.MathUtils.clamp(
        _sphTarget.radius,
        controls.minDistance,
        controls.maxDistance
      );
    };

    /** Seed the gesture from wherever the camera already is, so it never jumps. */
    const beginTouchGesture = () => {
      if (!touchOwnsCamera) {
        _sphOffset.copy(camera.position).sub(controls.target);
        _sphNow.setFromVector3(_sphOffset);
        _sphTarget.copy(_sphNow);
        touchOwnsCamera = true;
      }
      clampSphericalTarget();
      hasInteracted = true;
      userInteracting = true;
      controls.autoRotate = false;
      controls.enableRotate = false;
      lastInteractionTime = Date.now();
      onInteract();
    };

    const pinchSpread = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );

    domElement.addEventListener('touchstart', (e: TouchEvent) => {
      // A touch that lands while the page is still flinging is not cancelable:
      // the browser has already committed that gesture to scrolling. Claiming it
      // anyway would rotate the model and scroll the page at the same time, so
      // it is left alone — the touch just stops the fling, as it does anywhere
      // else on the page, and the next drag orbits normally.
      // Only bail on a *fresh* gesture: a second finger arriving mid-orbit must
      // not abandon the gesture already in progress.
      if (!e.cancelable && touchMode === 'none') return;
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (!checkHit(t.clientX, t.clientY)) {
          touchMode = 'none'; // empty sky: let the page scroll
          return;
        }
        if (e.cancelable) e.preventDefault();
        touchMode = 'orbit';
        lastTouchX = t.clientX;
        lastTouchY = t.clientY;
        beginTouchGesture();
      } else if (e.touches.length === 2) {
        const t = e.touches;
        const midX = (t[0].clientX + t[1].clientX) / 2;
        const midY = (t[0].clientY + t[1].clientY) / 2;
        // A pinch counts if either finger or the midpoint is over the villa.
        const onModel =
          touchMode === 'orbit' ||
          checkHit(midX, midY) ||
          checkHit(t[0].clientX, t[0].clientY) ||
          checkHit(t[1].clientX, t[1].clientY);
        if (!onModel) return;
        if (e.cancelable) e.preventDefault();
        touchMode = 'pinch';
        beginTouchGesture();
        pinchStartDist = pinchSpread(t);
        pinchStartRadius = _sphTarget.radius;
      }
    }, { passive: false });

    domElement.addEventListener('touchmove', (e: TouchEvent) => {
      if (touchMode === 'orbit' && e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();
        const t = e.touches[0];
        // Normalised against height in both axes so a drag feels the same
        // whichever way it goes, and matched to the desktop rotateSpeed.
        const h = domElement.clientHeight || 1;
        _sphTarget.theta -=
          ((2 * Math.PI * (t.clientX - lastTouchX)) / h) * controls.rotateSpeed;
        _sphTarget.phi -=
          ((2 * Math.PI * (t.clientY - lastTouchY)) / h) * controls.rotateSpeed;
        lastTouchX = t.clientX;
        lastTouchY = t.clientY;
        clampSphericalTarget();
        lastInteractionTime = Date.now();
        requestRender();
      } else if (touchMode === 'pinch' && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        const spread = pinchSpread(e.touches);
        if (pinchStartDist > 0 && spread > 0) {
          _sphTarget.radius = pinchStartRadius * (pinchStartDist / spread);
          clampSphericalTarget();
          lastInteractionTime = Date.now();
          requestRender();
        }
      }
    }, { passive: false });

    const endTouch = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        touchMode = 'none';
        lastInteractionTime = Date.now();
      } else if (e.touches.length === 1 && touchMode === 'pinch') {
        // Lifting one finger out of a pinch continues as an orbit, from where
        // the remaining finger is, rather than snapping the model.
        touchMode = 'orbit';
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
    };
    domElement.addEventListener('touchend', endTouch, { passive: true });
    domElement.addEventListener('touchcancel', endTouch, { passive: true });

    // Selective wheel zooming (page scroll has full priority)
    domElement.addEventListener('wheel', (e: WheelEvent) => {
      if (!isOverModel) return; // Empty space -> webpage scrolls freely!
      const timeSince = Date.now() - lastInteractionTime;
      const isActivelyExploring = hasInteracted && (timeSince < 3500 || isDragging);
      if (isActivelyExploring) {
        e.preventDefault();
        lastInteractionTime = Date.now();
        const factor = e.deltaY > 0 ? 1.05 : 0.95;
        const currentDist = camera.position.distanceTo(controls.target);
        const targetDist = THREE.MathUtils.clamp(
          currentDist * factor,
          controls.minDistance,
          controls.maxDistance
        );
        _cameraOffset.copy(camera.position).sub(controls.target);
        _cameraOffset.setLength(targetDist);
        camera.position.copy(controls.target).add(_cameraOffset);
        controls.update();
        requestRender();
      }
    }, { passive: false });

    // 7. Render Loop
    let lastTime = performance.now();
    let frameCount = 0;
    let drawCount = 0;
    let lastTelemetryTime = performance.now();

    // Used to tell whether this frame differs from the one already on screen.
    const _prevPos = new THREE.Vector3(Infinity, Infinity, Infinity);
    const _prevTarget = new THREE.Vector3(Infinity, Infinity, Infinity);
    const moveEpsilonSq = Math.pow(radius * 1e-4, 2);

    const tick = () => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;
      frameCount++;

      const dtSeconds = Math.min(delta / 1000, 0.1);
      const lerpFactor = 1 - Math.exp(-6.0 * dtSeconds);

      if (touchOwnsCamera && touchMode === 'none' && Date.now() - lastInteractionTime > 4000) {
        // Idle after a gesture: hand the camera back to OrbitControls, which
        // reads it straight from camera.position, so the gentle auto-rotation
        // resumes from exactly where the finger left it.
        touchOwnsCamera = false;
      }

      if (touchOwnsCamera) {
        // Ease toward what the finger asked for. Because the target moves and
        // the camera chases it, a jittery touch stream still reads as a smooth,
        // weighted rotation, and releasing the finger glides to a stop.
        const k = 1 - Math.exp(-13 * dtSeconds);
        _sphNow.theta += (_sphTarget.theta - _sphNow.theta) * k;
        _sphNow.phi += (_sphTarget.phi - _sphNow.phi) * k;
        _sphNow.radius += (_sphTarget.radius - _sphNow.radius) * k;
        _sphNow.makeSafe();
        camera.position.copy(controls.target).add(_sphOffset.setFromSpherical(_sphNow));
        camera.lookAt(controls.target);
      } else if (!userInteracting) {
        const easeP = 1 - Math.pow(1 - scrollProgress, 2.5);
        _idealPos.lerpVectors(_entryCameraPos, _heroCameraPos, easeP);
        if (scrollProgress <= 0) {
          // Still below the fold, inside the observer's warm-up margin. Easing
          // toward the start pose here would spend a second or more of drawing
          // on a transition nobody can see — over the top of the section above,
          // which is doing its own scroll-linked work. Snapping costs one frame
          // and then the loop goes quiet. The visible entry is untouched: at
          // progress 0 the eased target is exactly this pose, so the moment the
          // section starts entering, the lerp picks up from the same place.
          camera.position.copy(_idealPos);
          controls.target.copy(_idealTarget);
        } else {
          camera.position.lerp(_idealPos, lerpFactor);
          controls.target.lerp(_idealTarget, lerpFactor);
        }
      } else if (!isDragging && Date.now() - lastInteractionTime > 4000) {
        // Resume gentle auto-rotation after 4s of inactivity
        controls.autoRotate = true;
      }

      controls.update();

      // Draw only when the view actually changed.
      //
      // Deliberately not keyed off what controls.update() returns. Every update
      // round-trips the camera through spherical coordinates and back, and the
      // trig does not land on exactly the same vector it started from. Its own
      // "did it move" test uses an epsilon far below that rounding, so it
      // reports movement on a perfectly still camera, every frame, forever —
      // which is precisely the offscreen redraw this is meant to stop. The
      // comparison below uses a threshold a thousand times larger than that
      // rounding and still far below one pixel of visible motion.
      if (
        needsRender ||
        camera.position.distanceToSquared(_prevPos) > moveEpsilonSq ||
        controls.target.distanceToSquared(_prevTarget) > moveEpsilonSq
      ) {
        _prevPos.copy(camera.position);
        _prevTarget.copy(controls.target);
        needsRender = false;
        drawCount++;
        renderer.render(scene, camera);
      }

      if (perfEl && now - lastTelemetryTime > 250) {
        const span = now - lastTelemetryTime;
        const fps = Math.round((frameCount * 1000) / span);
        // Loop ticks vs frames actually submitted to the GPU. With the
        // draw-on-demand loop these diverge: a settled model ticks but draws 0.
        const dps = Math.round((drawCount * 1000) / span);
        const calls = renderer.info.render.calls;
        const triangles = renderer.info.render.triangles;
        const textures = renderer.info.memory.textures;
        // Camera azimuth/polar/distance are included so the scroll-linked entry
        // and the touch orbit can be read off directly while diagnosing.
        _sphOffset.copy(camera.position).sub(controls.target);
        const s = _sphReadout.setFromVector3(_sphOffset);
        perfEl.textContent =
          `Loop: ${fps}/s | Draws: ${dps}/s | Frame: ${delta.toFixed(1)}ms | Calls: ${calls} | ` +
          `Triangles: ${triangles.toLocaleString()} | Textures: ${textures} | ` +
          `DPR: ${renderer.getPixelRatio().toFixed(2)} | ` +
          `Cam: θ${s.theta.toFixed(3)} φ${s.phi.toFixed(3)} r${s.radius.toFixed(2)}`;
        frameCount = 0;
        drawCount = 0;
        lastTelemetryTime = now;
      }
    };

    const play = () => {
      if (!isPlaying) {
        isPlaying = true;
        // Always draw at least once on resume: the drawing buffer is not
        // guaranteed to survive a pause, so the section must never come back
        // to a blank canvas.
        needsRender = true;
        lastTime = performance.now();
        renderer.setAnimationLoop(tick);
      }
    };

    const pause = () => {
      if (isPlaying) {
        isPlaying = false;
        renderer.setAnimationLoop(null);
      }
    };

    const resize = (w: number, h: number) => {
      // Mobile browsers fire a resize on every address-bar collapse, which would
      // otherwise rebuild the render target and re-frame the camera mid-scroll.
      if (!w || !h) return;
      const dpr = renderer.getPixelRatio();
      if (
        Math.abs(renderer.domElement.width / dpr - w) < 1 &&
        Math.abs(renderer.domElement.height / dpr - h) < 1
      ) {
        return;
      }
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      frameView();
      requestRender();
    };

    const reset = () => {
      userInteracting = false;
      hasInteracted = false;
      touchOwnsCamera = false;
      touchMode = 'none';
      hasReportedInteraction = false;
      frameView();
      controls.autoRotate = true;
      requestRender();
    };

    const setScrollProgress = (p: number) => {
      scrollProgress = p;
    };

    const setUserInteracting = (val: boolean) => {
      userInteracting = val;
    };

    const setPerfElement = (el: HTMLDivElement | null) => {
      perfEl = el;
      requestRender();
    };

    const setOnInteract = (cb: (() => void) | null) => {
      interactCb = cb;
    };

    setLoad('ready', 1);

    viewerSingleton = {
      renderer,
      scene,
      camera,
      controls,
      model,
      domElement,
      isReady: true,
      frameView,
      play,
      pause,
      resize,
      reset,
      setScrollProgress,
      setUserInteracting,
      setPerfElement,
      setOnInteract,
    };

    if (mountElement && !mountElement.contains(domElement)) {
      mountElement.appendChild(domElement);
      resize(mountElement.clientWidth, mountElement.clientHeight);
    }

    return viewerSingleton;
  })().catch((err) => {
    initViewerPromise = null;
    setLoad('error', loadState.progress);
    throw err;
  });

  return initViewerPromise;
}

// Background initialization: strictly waits until the user starts scrolling down (scrollY > 150),
// or until 4.5 seconds of idle time have passed on the hero.
// This completely frees the main thread and network during the initial hero entrance!
if (typeof window !== 'undefined') {
  let initialized = false;

  // Evaluating the three.js chunk, Draco-decoding the villa and compiling its
  // shaders are long main-thread tasks. Both triggers below hand them to an
  // idle slot rather than running them inline: the scroll trigger used to fire
  // this work from inside a scroll handler, so the very act of starting to
  // scroll stuttered the page. The timeout keeps it prompt on a busy thread —
  // it still lands long before the section itself is reached.
  const scheduleInit = () => {
    if (initialized) return;
    initialized = true;
    window.removeEventListener('scroll', onScrollCheck);
    const run = () => getOrInitViewer().catch(console.error);
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(run, { timeout: 1500 });
    } else {
      setTimeout(run, 200);
    }
  };

  const onScrollCheck = () => {
    if (window.scrollY > 150) {
      scheduleInit();
    }
  };

  window.addEventListener('scroll', onScrollCheck, { passive: true });

  // Fallback: If user stays on hero without scrolling for 4.5s (well after hero entrance finishes)
  setTimeout(scheduleInit, 4500);
}

export const VillaShowcase: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const perfRef = useRef<HTMLDivElement>(null);

  const reduced = useReducedMotion();

  // Resolved during the first render rather than in an effect, so the caption
  // is right immediately instead of re-rendering the section on mount.
  const [touch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  );
  const [moved, setMoved] = useState(false);
  const load = useLoadState();
  // The loader stays mounted just long enough to fade out, then leaves the DOM.
  const [loaderGone, setLoaderGone] = useState(() => loadState.phase === 'ready');
  useEffect(() => {
    if (load.phase !== 'ready') return;
    const t = window.setTimeout(() => setLoaderGone(true), 1200);
    return () => window.clearTimeout(t);
  }, [load.phase]);

  // Performance telemetry visibility (URL param ?perf=true or Ctrl+Shift+P)
  const [showPerf, setShowPerf] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('perf') === 'true';
    }
    return false;
  });

  const isOnScreenRef = useRef(false);
  const remeasureRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        setShowPerf((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Update telemetry target in singleton
  const showPerfRef = useRef(showPerf);
  useEffect(() => {
    showPerfRef.current = showPerf;
    viewerSingleton?.setPerfElement(showPerf ? perfRef.current : null);
  }, [showPerf]);

  // Connect to persistent viewer singleton on mount
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let unmounted = false;

    getOrInitViewer(mount).then((viewer) => {
      if (unmounted) return;

      if (!mount.contains(viewer.domElement)) {
        mount.appendChild(viewer.domElement);
      }
      viewer.resize(mount.clientWidth, mount.clientHeight);
      viewer.setOnInteract(() => setMoved(true));
      // The effect below only fires when showPerf changes, and on first load
      // the viewer does not exist yet when it runs — so the readout has to be
      // re-attached here, once the singleton is actually ready.
      viewer.setPerfElement(showPerfRef.current ? perfRef.current : null);

      // Only run render loop if currently in or nearing the viewport
      if (isOnScreenRef.current) {
        viewer.play();
      }
    }).catch(console.error);

    // Coalesced to a frame: a phone fires a burst of these as the address bar
    // collapses, and each one would otherwise rebuild the render target.
    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        if (mount.clientWidth && mount.clientHeight) {
          viewerSingleton?.resize(mount.clientWidth, mount.clientHeight);
        }
      });
    });
    ro.observe(mount);

    return () => {
      unmounted = true;
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      ro.disconnect();
      viewerSingleton?.setOnInteract(null);
      viewerSingleton?.pause();
    };
  }, []);

  // IntersectionObserver to pause/play render loop without destroying any assets
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const onScreen = entries.some((e) => e.isIntersecting);
        isOnScreenRef.current = onScreen;

        // Everything above this section — lazily decoded photos, the pinned
        // strip sizing itself — settles after first paint, which moves this
        // section's page offset. Re-measuring on each crossing keeps the
        // scroll-linked camera entry anchored to where the section really is.
        remeasureRef.current?.();

        if (viewerSingleton?.isReady) {
          if (onScreen) {
            viewerSingleton.play();
          } else {
            viewerSingleton.pause();
          }
        } else if (onScreen) {
          getOrInitViewer(mountRef.current).then((viewer) => {
            if (isOnScreenRef.current) {
              viewer.play();
            }
          }).catch(console.error);
        }
      },
      // Asymmetric on purpose. The bottom margin warms the loop up while the
      // section is still below the fold, so the scroll-linked camera entry is
      // already running by the time it appears. There is deliberately no top
      // margin: the moment the section is above the viewport — i.e. the user
      // has scrolled on into the strip below it — the loop stops, instead of
      // continuing to draw for another 350px while that section does its own
      // scroll-linked work. Nothing is destroyed, so coming back is instant.
      { rootMargin: '0px 0px 350px 0px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Passive scroll progress tracking (0 forced reflows, rAF throttled)
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let rafId = 0;
    let cachedOffsetTop = 0;

    const measureOffset = () => {
      let top = 0;
      let curr: HTMLElement | null = el;
      while (curr) {
        top += curr.offsetTop;
        curr = curr.offsetParent as HTMLElement | null;
      }
      cachedOffsetTop = top;
    };
    measureOffset();

    const updateProgress = () => {
      rafId = 0;
      const scrollY = window.scrollY || window.pageYOffset;
      const vh = window.innerHeight || 1;
      const topDistance = cachedOffsetTop - scrollY;
      const p = Math.min(1, Math.max(0, (vh - topDistance) / (vh * 0.9)));
      viewerSingleton?.setScrollProgress(p);
    };

    // Called when the section crosses the observer: re-measures, then seeds the
    // progress immediately. Scroll updates are suppressed while the section is
    // off screen, so without this the camera would run on the progress it had
    // when it left until the next scroll event arrived.
    remeasureRef.current = () => {
      measureOffset();
      updateProgress();
    };

    const handleScroll = () => {
      // Nothing to drive while the section is nowhere near the viewport.
      if (rafId || !isOnScreenRef.current) return;
      rafId = requestAnimationFrame(updateProgress);
    };

    // measureOffset walks offsetParents, which forces layout. Phones fire a
    // resize on every address-bar movement — mid-scroll — so it is coalesced
    // to a frame rather than run per event.
    let measureRaf = 0;
    const handleResize = () => {
      if (measureRaf) return;
      measureRaf = requestAnimationFrame(() => {
        measureRaf = 0;
        measureOffset();
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    updateProgress();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (measureRaf) cancelAnimationFrame(measureRaf);
      remeasureRef.current = null;
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleRetry = useCallback(() => {
    const mount = mountRef.current;
    setLoad('loading', 0.03);
    getOrInitViewer(mount)
      .then((viewer) => {
        if (mount && !mount.contains(viewer.domElement)) mount.appendChild(viewer.domElement);
        if (mount) viewer.resize(mount.clientWidth, mount.clientHeight);
        viewer.setOnInteract(() => setMoved(true));
        if (isOnScreenRef.current) viewer.play();
      })
      .catch(console.error);
  }, []);

  const handleReset = useCallback(() => {
    viewerSingleton?.reset();
    setMoved(false);
  }, []);

  return (
    <section
      id="showcase"
      ref={sectionRef}
      className="section-shell relative overflow-hidden bg-[#0A0A0C] text-[#F3EFEA] py-28 transition-colors duration-700"
      style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #15161B 0%, #0A0A0C 100%)',
      }}
    >
      <div className="content-shell">
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-12">
          <div>
            <Reveal as="p" className="eyebrow mb-6 text-[#C5A880] tracking-widest uppercase text-xs font-medium">
              The villa in three dimensions
            </Reveal>
            <MaskedHeading
              as="h2"
              className="font-display text-display-md text-[#F5F2EB]"
              lines={[
                'Walk around it',
                <em key="l2" className="italic text-[#E0D8CB] font-light">
                  before it exists.
                </em>,
              ]}
            />
          </div>
          <Reveal as="p" delay={0.15} className="lead mt-7 max-w-sm text-[#9E9B94] lg:mt-0 font-light">
            The full residence, its materials and its landscaping — turn it, tilt it and move in as close as you like.
          </Reveal>
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 28 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: DUR.base, ease: EASE }}
          className="mt-12"
        >
          {/* 3D viewport: the persistent WebGL canvas, with a progress loader over a still of the villa until the model is ready */}
          <div
            ref={mountRef}
            className="relative h-[62svh] min-h-[400px] w-full overflow-hidden rounded-[18px] border border-white/[0.08] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] lg:h-[78svh]"
            style={{
              background: 'radial-gradient(circle at 50% 45%, #18191F 0%, #101115 50%, #070709 100%)',
            }}
          >
            {!loaderGone && (
              <div
                className={`absolute inset-0 z-10 transition-opacity duration-1000 ease-expo ${
                  load.phase === 'ready' ? 'pointer-events-none opacity-0' : load.phase === 'error' ? 'opacity-100' : 'pointer-events-none opacity-100'
                }`}
              >
                <img
                  src="/images/skyline-facade.jpg"
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full scale-105 object-cover opacity-25 blur-[3px]"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(16,17,21,0.35)_0%,rgba(7,7,9,0.92)_75%)]" />
                <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
                  {load.phase === 'error' ? (
                    <>
                      <p className="font-display text-2xl text-[#F5F2EB]">The 3D villa didn't load.</p>
                      <p className="mt-2 max-w-xs text-sm font-light text-[#9E9B94]">This can happen on a weak connection. It's a large model, so it may take a moment.</p>
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="btn-solid mt-6 inline-flex items-center justify-center border border-[#C5A880]/60 text-[#F3EFEA] hover:border-[#C5A880] hover:bg-[#C5A880]/10"
                      >
                        Try again
                      </button>
                    </>
                  ) : (
                    <>
                      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90" aria-hidden="true">
                        <circle cx="38" cy="38" r="34" fill="none" stroke="rgba(243,239,234,0.12)" strokeWidth="1.5" />
                        <circle
                          cx="38"
                          cy="38"
                          r="34"
                          fill="none"
                          stroke="#C5A880"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 34}
                          strokeDashoffset={2 * Math.PI * 34 * (1 - load.progress)}
                          style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.16,1,0.3,1)' }}
                        />
                      </svg>
                      <p className="tabular -mt-[49px] mb-[33px] text-[13px] font-medium text-[#F3EFEA]" aria-live="polite">
                        {Math.round(load.progress * 100)}%
                      </p>
                      <p className="caption mt-5 text-[#C5A880]">{load.phase === 'idle' ? 'Preparing the 3D villa' : 'Loading the 3D villa'}</p>
                      <p className="mt-2 text-xs font-light text-[#8D8A83]">Full residence and landscaping · first visit only</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Dev telemetry badge (hidden unless ?perf=true or Ctrl+Shift+P) */}
            {showPerf && (
              <div
                ref={perfRef}
                className="absolute top-4 left-4 z-20 font-mono text-[11px] text-[#C5A880] bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10 shadow-lg pointer-events-none"
              >
                Initializing performance telemetry...
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-6 px-1">
            <p className="caption text-[#8D8A83] text-xs">
              {touch ? 'Touch model to rotate · Pinch to zoom' : 'Drag model to rotate · Scroll page freely'}
            </p>
            {moved && (
              <button
                type="button"
                onClick={handleReset}
                className="link-underline btn-label pb-1 text-[#C5A880] hover:text-[#F3EFEA] text-xs transition-colors duration-300"
              >
                Reset view
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
