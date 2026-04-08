import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewDirection, VoxelShape } from '../models/game.models';

const BACKGROUND_COLOR = 0x0f0f1a;
const STANDARD_COLOR = 0x6366f1;   // indigo
const EDGE_COLOR = 0x818cf8;
const EDGE_OPACITY = 0.5;

/** Predefined camera positions for each view direction (distance from center). */
const CAMERA_OFFSETS: Record<ViewDirection, [number, number, number]> = {
  front:  [0, 0, 8],
  back:   [0, 0, -8],
  right:  [8, 0, 0],
  left:   [-8, 0, 0],
  top:    [0, 8, 0.01],   // slight Z offset to avoid gimbal lock
  bottom: [0, -8, 0.01],
};

@Injectable({ providedIn: 'root' })
export class ThreeSceneService {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private animationFrameId: number | null = null;
  private isDisposed = false;
  private shapeCenter = new THREE.Vector3();

  init(canvas: HTMLCanvasElement, shape: VoxelShape, colorMode: boolean): void {
    this.isDisposed = false;
    const parent = canvas.parentElement!;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);

    // Camera — isometric-like 3/4 angle
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);

    // Compute shape center for orbit target
    const bb = shape.boundingBox;
    this.shapeCenter.set(
      (bb.min[0] + bb.max[0]) / 2,
      (bb.min[1] + bb.max[1]) / 2,
      (bb.min[2] + bb.max[2]) / 2,
    );

    // Position camera at 3/4 isometric-like angle
    const maxDim = Math.max(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]) + 1;
    const dist = maxDim * 2.5;
    this.camera.position.set(
      this.shapeCenter.x + dist * 0.7,
      this.shapeCenter.y + dist * 0.6,
      this.shapeCenter.z + dist * 0.7,
    );
    this.camera.lookAt(this.shapeCenter);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.enablePan = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.target.copy(this.shapeCenter);
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_ROTATE,
    };
    this.controls.update();

    // Lighting
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    this.scene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Render voxels
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: EDGE_OPACITY });

    for (const voxel of shape.voxels) {
      const mat = new THREE.MeshStandardMaterial({
        color: colorMode ? voxel.color : STANDARD_COLOR,
      });
      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.position.set(...voxel.position);
      this.scene.add(mesh);

      const edges = new THREE.LineSegments(edgesGeo, edgeMat);
      edges.position.set(...voxel.position);
      this.scene.add(edges);
    }
  }

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

  rotateTo(direction: ViewDirection): void {
    if (!this.camera || !this.controls || this.isDisposed) return;

    const offset = CAMERA_OFFSETS[direction];
    this.camera.position.set(
      this.shapeCenter.x + offset[0],
      this.shapeCenter.y + offset[1],
      this.shapeCenter.z + offset[2],
    );
    this.camera.lookAt(this.shapeCenter);
    this.controls.target.copy(this.shapeCenter);
    this.controls.update();
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

    // Traverse scene and dispose geometries/materials
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
  }
}
