declare module 'three/examples/jsm/controls/OrbitControls' {
    import { Camera, EventDispatcher } from 'three';

    export class OrbitControls extends EventDispatcher {
        constructor(camera: Camera, domElement?: HTMLElement);

        enabled: boolean;
        target: { x: number; y: number; z: number };
        enableZoom: boolean;
        enablePan: boolean;
        rotateSpeed: number;

        update(): void;
        dispose(): void;
    }
} 