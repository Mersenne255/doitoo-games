import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InteractionMode, ShapeDiff, VoxelColor, VoxelShape, VoxelSymbol, VOXEL_COLORS } from '../models/game.models';

const BACKGROUND_COLOR = 0x0f0f1a;
const STANDARD_COLOR = 0x6366f1;
const EDGE_COLOR = 0x818cf8;
const EDGE_OPACITY = 0.5;
const CORRECT_COLOR = 0x22c55e;
const MISSING_COLOR = 0xef4444;
const EXTRA_COLOR = 0xf59e0b;
const ANCHOR_EDGE_COLOR = 0xfde68a;

@Injectable({ providedIn: 'root' })
export class ThreeSceneService {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private animationFrameId: number | null = null;
  private isDisposed = false;
  private shapeCenter = new THREE.Vector3();

  // Build scene state
  private cubeMeshes = new Map<string, THREE.Mesh>();
  private cubeEdges = new Map<string, THREE.LineSegments>();
  private hoverMesh: THREE.Mesh | null = null;
  private highlightedCubeKey: string | null = null;
  private highlightedOriginalColor: number | null = null;
  private currentMode: InteractionMode = 'build';
  private colorMode = false;

  // Tap vs drag detection
  private pointerStartX = 0;
  private pointerStartY = 0;
  private pointerStartTime = 0;

  // Shared geometry
  private boxGeo = new THREE.BoxGeometry(1, 1, 1);
  private edgesGeo = new THREE.EdgesGeometry(this.boxGeo);

  // ── Study scene (existing init) ──

  init(canvas: HTMLCanvasElement, shape: VoxelShape, colorMode: boolean): void {
    this.isDisposed = false;
    this.colorMode = colorMode;
    const parent = canvas.parentElement!;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);

    const bb = shape.boundingBox;
    this.shapeCenter.set(
      (bb.min[0] + bb.max[0]) / 2,
      (bb.min[1] + bb.max[1]) / 2,
      (bb.min[2] + bb.max[2]) / 2,
    );

    const maxDim = Math.max(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]) + 1;
    const dist = maxDim * 2.5;
    this.camera.position.set(
      this.shapeCenter.x + dist * 0.7,
      this.shapeCenter.y + dist * 0.6,
      this.shapeCenter.z + dist * 0.7,
    );
    this.camera.lookAt(this.shapeCenter);

    this.setupControls(canvas);
    this.addLighting();

    const edgeMat = new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: EDGE_OPACITY });

    for (const voxel of shape.voxels) {
      const mat = this.createCubeMaterial(
        colorMode ? voxel.color : `#${STANDARD_COLOR.toString(16).padStart(6, '0')}`,
        voxel.symbol,
      );
      const mesh = new THREE.Mesh(this.boxGeo, mat);
      mesh.position.set(...voxel.position);
      this.scene.add(mesh);

      const edges = new THREE.LineSegments(this.edgesGeo, edgeMat);
      edges.position.set(...voxel.position);
      this.scene.add(edges);
    }
  }

  // ── Build scene ──

  initBuildScene(canvas: HTMLCanvasElement, anchorPosition: [number, number, number], colorMode: boolean): void {
    this.isDisposed = false;
    this.colorMode = colorMode;
    this.cubeMeshes.clear();
    this.cubeEdges.clear();
    this.hoverMesh = null;
    this.highlightedCubeKey = null;
    this.highlightedOriginalColor = null;
    this.currentMode = 'build';

    const parent = canvas.parentElement!;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.shapeCenter.set(...anchorPosition);

    this.camera.position.set(
      this.shapeCenter.x + 6,
      this.shapeCenter.y + 5,
      this.shapeCenter.z + 6,
    );
    this.camera.lookAt(this.shapeCenter);

    this.setupControls(canvas);
    this.addLighting();

    // Add anchor cube with distinct visual
    this.addCubeToScene(anchorPosition, colorMode ? VOXEL_COLORS[0] : undefined, true);
  }

  // ── Comparison scene ──

  initComparisonScene(canvas: HTMLCanvasElement, shapeDiff: ShapeDiff, colorMode: boolean): void {
    this.isDisposed = false;
    this.colorMode = colorMode;

    const parent = canvas.parentElement!;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);

    // Compute center from all cubes
    const allPositions = [
      ...shapeDiff.correct.map(v => [v.x, v.y, v.z]),
      ...shapeDiff.missing.map(v => [v.x, v.y, v.z]),
      ...shapeDiff.extra.map(v => [v.x, v.y, v.z]),
    ];
    if (allPositions.length > 0) {
      const cx = allPositions.reduce((s, p) => s + p[0], 0) / allPositions.length;
      const cy = allPositions.reduce((s, p) => s + p[1], 0) / allPositions.length;
      const cz = allPositions.reduce((s, p) => s + p[2], 0) / allPositions.length;
      this.shapeCenter.set(cx, cy, cz);
    } else {
      this.shapeCenter.set(0, 0, 0);
    }

    const maxDim = Math.max(
      ...allPositions.map(p => Math.abs(p[0] - this.shapeCenter.x)),
      ...allPositions.map(p => Math.abs(p[1] - this.shapeCenter.y)),
      ...allPositions.map(p => Math.abs(p[2] - this.shapeCenter.z)),
      1,
    ) + 1;
    const dist = maxDim * 3;
    this.camera.position.set(
      this.shapeCenter.x + dist * 0.7,
      this.shapeCenter.y + dist * 0.6,
      this.shapeCenter.z + dist * 0.7,
    );
    this.camera.lookAt(this.shapeCenter);

    this.setupControls(canvas);
    this.addLighting();

    // Correct cubes — green solid
    for (const v of shapeDiff.correct) {
      const mat = new THREE.MeshStandardMaterial({ color: CORRECT_COLOR });
      const mesh = new THREE.Mesh(this.boxGeo, mat);
      mesh.position.set(v.x, v.y, v.z);
      this.scene.add(mesh);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0.5 });
      const edges = new THREE.LineSegments(this.edgesGeo, edgeMat);
      edges.position.set(v.x, v.y, v.z);
      this.scene.add(edges);
    }

    // Missing cubes — red wireframe/ghost
    for (const v of shapeDiff.missing) {
      const fillMat = new THREE.MeshStandardMaterial({
        color: MISSING_COLOR,
        transparent: true,
        opacity: 0.15,
      });
      const fillMesh = new THREE.Mesh(this.boxGeo, fillMat);
      fillMesh.position.set(v.x, v.y, v.z);
      this.scene.add(fillMesh);
      const edgeMat = new THREE.LineBasicMaterial({ color: MISSING_COLOR });
      const edges = new THREE.LineSegments(this.edgesGeo, edgeMat);
      edges.position.set(v.x, v.y, v.z);
      this.scene.add(edges);
    }

    // Extra cubes — orange solid
    for (const v of shapeDiff.extra) {
      const mat = new THREE.MeshStandardMaterial({ color: EXTRA_COLOR });
      const mesh = new THREE.Mesh(this.boxGeo, mat);
      mesh.position.set(v.x, v.y, v.z);
      this.scene.add(mesh);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.5 });
      const edges = new THREE.LineSegments(this.edgesGeo, edgeMat);
      edges.position.set(v.x, v.y, v.z);
      this.scene.add(edges);
    }
  }

  // ── Interaction mode ──

  setInteractionMode(mode: InteractionMode): void {
    this.currentMode = mode;
    // Orbit controls stay enabled in both modes — taps are distinguished from drags
    if (this.controls) {
      this.controls.enabled = true;
    }
    this.setHoverPreview(null);
    this.setHoverHighlight(null);
  }

  // ── Raycasting ──

  getClickedFace(event: MouseEvent | TouchEvent): { position: [number, number, number]; faceNormal: [number, number, number] } | null {
    if (!this.camera || !this.scene || !this.renderer) return null;

    const ndc = this.getNDC(event);
    if (!ndc) return null;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);

    const meshes = this.getMeshesFromScene();
    const intersections = raycaster.intersectObjects(meshes);
    if (intersections.length === 0 || !intersections[0].face) return null;

    const hit = intersections[0];
    // Face normal is in object-local space. Since cubes are axis-aligned with no rotation,
    // we just need to transform the normal by the object's world rotation (identity in our case).
    const normal = hit.face!.normal.clone();
    normal.transformDirection(hit.object.matrixWorld);

    const fn: [number, number, number] = [
      Math.round(normal.x),
      Math.round(normal.y),
      Math.round(normal.z),
    ];

    const cubePos = hit.object.position;
    const adjacent: [number, number, number] = [
      Math.round(cubePos.x) + fn[0],
      Math.round(cubePos.y) + fn[1],
      Math.round(cubePos.z) + fn[2],
    ];

    return { position: adjacent, faceNormal: fn };
  }

  getClickedCube(event: MouseEvent | TouchEvent): [number, number, number] | null {
    if (!this.camera || !this.scene || !this.renderer) return null;

    const ndc = this.getNDC(event);
    if (!ndc) return null;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);

    const meshes = this.getMeshesFromScene();
    const intersections = raycaster.intersectObjects(meshes);
    if (intersections.length === 0) return null;

    const pos = intersections[0].object.position;
    return [Math.round(pos.x), Math.round(pos.y), Math.round(pos.z)];
  }

  // ── Build scene cube management ──

  addCubeToScene(position: [number, number, number], color?: VoxelColor, isAnchor = false, symbol?: VoxelSymbol | null): void {
    if (!this.scene) return;
    const key = `${position[0]},${position[1]},${position[2]}`;
    if (this.cubeMeshes.has(key)) return;

    let mat: THREE.Material | THREE.Material[];
    if (isAnchor) {
      mat = this.createAnchorMaterial();
    } else {
      const colorStr = color ?? `#${STANDARD_COLOR.toString(16).padStart(6, '0')}`;
      mat = this.createCubeMaterial(colorStr, symbol ?? null);
    }
    const mesh = new THREE.Mesh(this.boxGeo, mat);
    mesh.position.set(...position);
    this.scene.add(mesh);
    this.cubeMeshes.set(key, mesh);

    const edgeColor = isAnchor ? ANCHOR_EDGE_COLOR : EDGE_COLOR;
    const edgeOpacity = isAnchor ? 1.0 : EDGE_OPACITY;
    const lineWidth = 1;
    const edgeMat = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: edgeOpacity, linewidth: lineWidth });
    const edges = new THREE.LineSegments(this.edgesGeo, edgeMat);
    edges.position.set(...position);
    this.scene.add(edges);
    this.cubeEdges.set(key, edges);
  }

  removeCubeFromScene(position: [number, number, number]): void {
    if (!this.scene) return;
    const key = `${position[0]},${position[1]},${position[2]}`;

    const mesh = this.cubeMeshes.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
      this.cubeMeshes.delete(key);
    }

    const edges = this.cubeEdges.get(key);
    if (edges) {
      this.scene.remove(edges);
      if (Array.isArray(edges.material)) {
        edges.material.forEach(m => m.dispose());
      } else {
        edges.material.dispose();
      }
      this.cubeEdges.delete(key);
    }
  }

  // ── Hover preview (Add mode) ──

  setHoverPreview(position: [number, number, number] | null, color?: VoxelColor): void {
    if (!this.scene) return;

    // Remove existing hover mesh
    if (this.hoverMesh) {
      this.scene.remove(this.hoverMesh);
      (this.hoverMesh.material as THREE.Material).dispose();
      this.hoverMesh = null;
    }

    if (position) {
      const hexColor = color ? parseInt(color.replace('#', ''), 16) : STANDARD_COLOR;
      const mat = new THREE.MeshStandardMaterial({
        color: hexColor,
        transparent: true,
        opacity: 0.4,
      });
      this.hoverMesh = new THREE.Mesh(this.boxGeo, mat);
      this.hoverMesh.position.set(...position);
      this.scene.add(this.hoverMesh);
    }
  }

  // ── Hover highlight (Remove mode) ──

  setHoverHighlight(position: [number, number, number] | null): void {
    // Restore previous highlight
    if (this.highlightedCubeKey !== null && this.highlightedOriginalColor !== null) {
      const mesh = this.cubeMeshes.get(this.highlightedCubeKey);
      if (mesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          (m as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        }
      }
      this.highlightedCubeKey = null;
      this.highlightedOriginalColor = null;
    }

    if (position) {
      const key = `${position[0]},${position[1]},${position[2]}`;
      const mesh = this.cubeMeshes.get(key);
      if (mesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        this.highlightedOriginalColor = (mats[0] as THREE.MeshStandardMaterial).emissive.getHex();
        this.highlightedCubeKey = key;
        for (const m of mats) {
          (m as THREE.MeshStandardMaterial).emissive.setHex(0xff0000);
          (m as THREE.MeshStandardMaterial).emissiveIntensity = 0.4;
        }
      }
    }
  }

  // ── Tap vs drag detection ──

  recordPointerDown(event: MouseEvent | TouchEvent): void {
    const coords = this.getClientCoords(event);
    if (!coords) return;
    this.pointerStartX = coords.x;
    this.pointerStartY = coords.y;
    this.pointerStartTime = Date.now();
  }

  isTap(event: MouseEvent | TouchEvent): boolean {
    const coords = this.getClientCoords(event);
    if (!coords) return false;
    const dx = coords.x - this.pointerStartX;
    const dy = coords.y - this.pointerStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const elapsed = Date.now() - this.pointerStartTime;
    return distance < 5 && elapsed < 300;
  }

  // ── Animation loop ──

  startAnimationLoop(): void {
    if (this.isDisposed) return;

    const animate = () => {
      if (this.isDisposed) return;
      this.animationFrameId = requestAnimationFrame(animate);
      this.controls?.update();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resize(): void {
    if (!this.renderer || !this.camera || this.isDisposed) return;

    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    this.stopAnimationLoop();

    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material?.dispose();
          }
        }
        if (object instanceof THREE.LineSegments) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
    }

    this.controls?.dispose();
    this.renderer?.dispose();

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.cubeMeshes.clear();
    this.cubeEdges.clear();
    this.hoverMesh = null;
    this.highlightedCubeKey = null;
    this.highlightedOriginalColor = null;
  }

  // ── Private helpers ──

  private createSymbolTexture(symbol: string, bgColor: string): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createAnchorMaterial(): THREE.Material[] {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Transparent background (hollow feel)
    ctx.clearRect(0, 0, size, size);

    // Subtle dark fill so the joker is readable
    ctx.fillStyle = 'rgba(40, 40, 60, 0.5)';
    ctx.fillRect(0, 0, size, size);

    // Joker symbol centered — bright white
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🃏', size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return Array.from({ length: 6 }, () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      })
    );
  }

  private createCubeMaterial(color: string | number, symbol: VoxelSymbol | null): THREE.Material | THREE.Material[] {
    const hexColor = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
    const bgColor = typeof color === 'string' ? color : `#${color.toString(16).padStart(6, '0')}`;

    if (symbol) {
      const texture = this.createSymbolTexture(symbol, bgColor);
      // Apply symbol texture to all 6 faces
      return Array.from({ length: 6 }, () => new THREE.MeshStandardMaterial({ map: texture }));
    }
    return new THREE.MeshStandardMaterial({ color: hexColor });
  }

  private setupControls(canvas: HTMLCanvasElement): void {
    if (!this.camera) return;
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.8;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.target.copy(this.shapeCenter);
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    this.controls.update();
  }

  private addLighting(): void {
    if (!this.scene) return;
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    this.scene.add(dirLight);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
  }

  private getNDC(event: MouseEvent | TouchEvent): THREE.Vector2 | null {
    if (!this.renderer) return null;
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const coords = this.getClientCoords(event);
    if (!coords) return null;
    return new THREE.Vector2(
      ((coords.x - rect.left) / rect.width) * 2 - 1,
      -((coords.y - rect.top) / rect.height) * 2 + 1,
    );
  }

  private getClientCoords(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
    if ('touches' in event) {
      const touch = event.touches[0] || (event as TouchEvent).changedTouches[0];
      if (!touch) return null;
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };
  }

  private getMeshesFromScene(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    if (!this.scene) return meshes;
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj !== this.hoverMesh) {
        meshes.push(obj);
      }
    });
    return meshes;
  }
}
