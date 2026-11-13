import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MESH_DEMO_SPLIT_MS, slowMs } from "@/lib/motion";

/**
 * The CyberSea 3D mesh demo's scene (MeshDemo.tsx loads this only when a
 * visitor asks to try it): a lean rebuild of the 3D viewer from the CyberSea
 * project (its ModelViewer.tsx), keeping just the dark grid space, the
 * vehicles, drag to rotate / pan, Wireframe ↔ Solid and Split (each part
 * pulled apart from the middle).
 *
 * Built to be light on the page it sits in:
 * - it draws a frame only when something changed (the camera moving or
 *   gliding to a stop, a split animating, a model loading), not 60 times a
 *   second regardless;
 * - it stops altogether while off screen or in a hidden tab;
 * - its resolution is capped at 1.5x on high-density screens;
 * - the mouse wheel isn't used for zoom, so scrolling over it still scrolls
 *   the page (no scroll trap);
 * - a model's split pieces are worked out once, the first time it's split;
 * - everything is disposed when the demo is closed.
 */

export type ViewMode = "wireframe" | "solid";

export interface MeshScene {
  load(url: string): Promise<void>;
  setMode(mode: ViewMode): void;
  setSplit(split: boolean): void;
  resetView(): void;
  dispose(): void;
}

const BG = 0x0a0a0a;
const WIRE = 0x3b82f6;
/** How far apart Split pulls the pieces, as a share of the model's size. */
const SPLIT_SPREAD = 0.35;
/** Above this many pieces a model splits by its parts instead. */
const MAX_PIECES = 240;

interface Piece {
  mesh: THREE.Mesh;
  home: THREE.Vector3;
  away: THREE.Vector3;
}

interface Loaded {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  solid: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
  pieces: Piece[] | null;
  size: number;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Splits one mesh's geometry into its connected pieces (triangles that share
 * a corner position belong together). Returns null when it's one piece or
 * too many. */
function connectedPieces(geom: THREE.BufferGeometry): THREE.BufferGeometry[] | null {
  const pos = geom.getAttribute("position");
  if (!pos) return null;
  const index = geom.getIndex();
  const triCount = index ? index.count / 3 : pos.count / 3;
  const vert = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k);
  // Vertices at the same position (to 4 decimals) count as one corner.
  const key = new Map<string, number>();
  const corner = new Int32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const k = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    let c = key.get(k);
    if (c === undefined) key.set(k, (c = key.size));
    corner[i] = c;
  }
  const parent = new Int32Array(key.size).map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]];
    return x;
  };
  for (let t = 0; t < triCount; t++) {
    const a = find(corner[vert(t, 0)]);
    const b = find(corner[vert(t, 1)]);
    const c = find(corner[vert(t, 2)]);
    parent[b] = a;
    parent[find(c)] = a;
  }
  const groups = new Map<number, number[]>();
  for (let t = 0; t < triCount; t++) {
    const r = find(corner[vert(t, 0)]);
    let g = groups.get(r);
    if (!g) groups.set(r, (g = []));
    g.push(t);
  }
  if (groups.size <= 1 || groups.size > MAX_PIECES) return null;
  const names = Object.keys(geom.attributes);
  return [...groups.values()].map((tris) => {
    const piece = new THREE.BufferGeometry();
    for (const name of names) {
      const src = geom.getAttribute(name) as THREE.BufferAttribute;
      const out = new Float32Array(tris.length * 3 * src.itemSize);
      let o = 0;
      for (const t of tris) {
        for (let k = 0; k < 3; k++) {
          const v = vert(t, k);
          for (let c = 0; c < src.itemSize; c++) out[o++] = src.getComponent(v, c);
        }
      }
      piece.setAttribute(name, new THREE.BufferAttribute(out, src.itemSize, src.normalized));
    }
    piece.computeBoundingBox();
    return piece;
  });
}

export function createMeshScene(
  container: HTMLElement,
  opts: { reducedMotion?: boolean; initialMode?: ViewMode } = {},
): MeshScene {
  // Reduced motion: Split jumps straight to apart / together.
  const SPLIT_MS = opts.reducedMotion ? 1 : slowMs(MESH_DEMO_SPLIT_MS);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  // The wheel scrolls the page, not the scene (no scroll trap).
  controls.enableZoom = false;

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(10, 20, 10);
  scene.add(sun);
  const accent = new THREE.SpotLight(WIRE, 2);
  accent.position.set(-10, 5, -5);
  scene.add(accent);
  // The dark grid floor. Not tone mapped (that dimmed it to nothing up close).
  const grid = new THREE.GridHelper(60, 60, 0x555555, 0x2a2a2a);
  (grid.material as THREE.Material).toneMapped = false;
  scene.add(grid);

  const wire = new THREE.MeshBasicMaterial({ color: WIRE, wireframe: true, transparent: true, opacity: 0.5 });

  let current: Loaded | null = null;
  let mode: ViewMode = opts.initialMode ?? "solid";
  let split = false;
  let splitFrom = 0;
  let splitTo = 0;
  let splitStart = 0;
  let dirty = true;
  let raf = 0;
  let running = false;
  let visible = true;
  let disposed = false;
  let loadToken = 0;
  const loader = new GLTFLoader();

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
    wake();
  };

  const frameCamera = () => {
    const size = current?.size ?? 4;
    const r = size * 1.2;
    camera.position.set(r * 0.62, r * 0.45, r * 0.62);
    controls.target.set(0, size * 0.18, 0);
    controls.update();
    dirty = true;
  };

  const applyMode = () => {
    if (!current) return;
    for (const mesh of current.pieces ? current.pieces.map((p) => p.mesh) : current.meshes) {
      mesh.material = mode === "wireframe" ? wire : (current.solid.get(mesh) ?? mesh.material);
    }
    grid.visible = true;
    dirty = true;
  };

  /** Works out the split pieces once per model: each mesh's connected
   * pieces (or the mesh itself), and where each moves to. */
  const buildPieces = (l: Loaded): Piece[] => {
    const center = new THREE.Box3().setFromObject(l.group).getCenter(new THREE.Vector3());
    const pieces: Piece[] = [];
    for (const mesh of l.meshes) {
      const parts = connectedPieces(mesh.geometry);
      const meshes: THREE.Mesh[] = [];
      if (parts) {
        for (const g of parts) {
          const m = new THREE.Mesh(g, mesh.material);
          m.position.copy(mesh.position);
          m.quaternion.copy(mesh.quaternion);
          m.scale.copy(mesh.scale);
          l.solid.set(m, l.solid.get(mesh) ?? mesh.material);
          l.group.add(m);
          meshes.push(m);
        }
        l.group.remove(mesh);
        mesh.geometry.dispose();
      } else {
        meshes.push(mesh);
      }
      for (const m of meshes) {
        m.updateMatrixWorld(true);
        const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
        const dir = c.sub(center);
        if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
        // In the group's own units (it's scaled to fit, unrotated).
        dir.normalize().multiplyScalar((l.size * SPLIT_SPREAD) / l.group.scale.x);
        pieces.push({ mesh: m, home: m.position.clone(), away: m.position.clone().add(dir) });
      }
    }
    return pieces;
  };

  const tick = (now: number) => {
    raf = 0;
    if (disposed || !visible || document.hidden) {
      running = false;
      return;
    }
    // update() reports whether the camera moved (dragging, or gliding to a
    // stop after a drag).
    const cameraMoved = controls.update();
    if (cameraMoved) dirty = true;
    if (current?.pieces && splitStart) {
      const t = Math.min(1, (now - splitStart) / SPLIT_MS);
      const k = splitFrom + (splitTo - splitFrom) * ease(t);
      for (const p of current.pieces) p.mesh.position.lerpVectors(p.home, p.away, k);
      dirty = true;
      if (t >= 1) splitStart = 0;
    }
    if (dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    // Keep going only while something is still moving (a drag, its glide,
    // a split).
    const moving = cameraMoved || splitStart !== 0;
    if (moving || interacting) raf = requestAnimationFrame(tick);
    else running = false;
  };
  let interacting = false;
  const wake = () => {
    if (disposed || running) return;
    running = true;
    raf = requestAnimationFrame(tick);
  };
  controls.addEventListener("start", () => {
    interacting = true;
    wake();
  });
  controls.addEventListener("end", () => {
    interacting = false;
    wake();
  });
  controls.addEventListener("change", () => {
    dirty = true;
    wake();
  });

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) {
      dirty = true;
      wake();
    }
  });
  io.observe(container);
  const onVisibility = () => {
    if (!document.hidden) {
      dirty = true;
      wake();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  resize();

  const unload = () => {
    if (!current) return;
    scene.remove(current.group);
    current.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
    for (const mat of new Set([...current.solid.values()].flat())) {
      for (const tex of Object.values(mat).filter((v): v is THREE.Texture => v instanceof THREE.Texture)) tex.dispose();
      mat.dispose();
    }
    current = null;
  };

  return {
    async load(url) {
      const token = ++loadToken;
      const gltf = await loader.loadAsync(url);
      if (disposed || token !== loadToken) return;
      unload();
      // Flatten into one group of meshes, keeping their world placement, so
      // Split can move each one on its own.
      const group = new THREE.Group();
      const meshes: THREE.Mesh[] = [];
      const solid = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) meshes.push(m);
      });
      for (const m of meshes) {
        const world = m.matrixWorld.clone();
        group.add(m);
        world.decompose(m.position, m.quaternion, m.scale);
        solid.set(m, m.material);
      }
      // Centred, standing on the grid, about 5 units across.
      const box = new THREE.Box3().setFromObject(group);
      const dims = box.getSize(new THREE.Vector3());
      const scale = 5 / Math.max(dims.x, dims.y, dims.z, 1e-6);
      group.scale.setScalar(scale);
      const c = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
      group.position.set(-c.x, -box.min.y * scale, -c.z);
      scene.add(group);
      current = { group, meshes, solid, pieces: null, size: 5 };
      if (split) {
        current.pieces = buildPieces(current);
        for (const p of current.pieces) p.mesh.position.copy(p.away);
      }
      applyMode();
      frameCamera();
      wake();
    },
    setMode(next) {
      mode = next;
      applyMode();
      wake();
    },
    setSplit(next) {
      if (next === split || !current) {
        split = next;
        return;
      }
      split = next;
      if (!current.pieces) {
        current.pieces = buildPieces(current);
        applyMode();
      }
      const now = performance.now();
      // Carry on from wherever a running split had got to.
      const t = splitStart ? Math.min(1, (now - splitStart) / SPLIT_MS) : 1;
      const at = splitStart ? splitFrom + (splitTo - splitFrom) * ease(t) : split ? 0 : 1;
      splitFrom = at;
      splitTo = split ? 1 : 0;
      splitStart = now;
      wake();
    },
    resetView() {
      frameCamera();
      wake();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      unload();
      wire.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
