import { Injectable, NgZone, PLATFORM_ID, Inject, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { BehaviorSubject, Observable } from 'rxjs';

interface PanoramaUrls {
  high: string;
  tiny: string;
}

@Injectable({
  providedIn: 'root'
})
export class PanoramaService implements OnInit {
  private scenes: Map<string, THREE.Scene> = new Map();
  private cameras: Map<string, THREE.PerspectiveCamera> = new Map();
  private renderers: Map<string, THREE.WebGLRenderer> = new Map();
  private controls: Map<string, any> = new Map();
  private observers: Map<string, IntersectionObserver> = new Map();
  private currentTextures: Map<string, THREE.Texture> = new Map();
  private animationFrames: Map<string, number> = new Map();
  private isHovered: Map<string, boolean> = new Map();
  private containers: Map<string, HTMLElement> = new Map();
  private overlays: Map<string, HTMLElement> = new Map();
  private activePanoramaId: string | null = null;
  private panoramaOrder: string[] = [];
  private capturedPanoramas: Set<string> = new Set();
  private loadingOverlays: Map<string, HTMLElement> = new Map();
  private loadingStates: Map<string, BehaviorSubject<boolean>> = new Map();
  private centerObserver: IntersectionObserver | null = null;
  private centerThreshold = 0.8;
  private isVisible: Map<string, boolean> = new Map();
  private canvasElements: Map<string, HTMLCanvasElement> = new Map();

  constructor(
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Wait for the next tick to ensure all panoramas are created
      setTimeout(() => {
        // Check if we have any panoramas
        if (this.panoramaOrder.length > 0) {
          // Activate the first panorama
          const firstPanoramaId = this.panoramaOrder[0];
          console.log(`Activating first panorama ${firstPanoramaId} in ngOnInit`);
          this.activatePanorama(firstPanoramaId);
        }
      }, 0);
    }
  }

  // Get loading state as an Observable
  getLoadingState(containerId: string): Observable<boolean> {
    if (!this.loadingStates.has(containerId)) {
      this.loadingStates.set(containerId, new BehaviorSubject<boolean>(false));
    }
    return this.loadingStates.get(containerId)!.asObservable();
  }

  // Update loading state
  private setLoadingState(containerId: string, isLoading: boolean): void {
    if (!this.loadingStates.has(containerId)) {
      this.loadingStates.set(containerId, new BehaviorSubject<boolean>(false));
    }
    this.loadingStates.get(containerId)!.next(isLoading);
  }

  private createLoadingOverlay(containerId: string): HTMLElement {
    const container = this.containers.get(containerId);
    if (!container) return document.createElement('div');

    const loadingOverlay = document.createElement('div');
    loadingOverlay.style.position = 'absolute';
    loadingOverlay.style.top = '50%';
    loadingOverlay.style.left = '50%';
    loadingOverlay.style.transform = 'translate(-50%, -50%)';
    loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    loadingOverlay.style.color = 'white';
    loadingOverlay.style.padding = '15px 25px';
    loadingOverlay.style.borderRadius = '8px';
    loadingOverlay.style.fontSize = '14px';
    loadingOverlay.style.zIndex = '1001';
    loadingOverlay.style.textAlign = 'center';
    this.isVisible.set(containerId, false); // Initialize visibility state

    const spinner = document.createElement('div');
    spinner.style.width = '30px';
    spinner.style.height = '30px';
    spinner.style.border = '3px solid #f3f3f3';
    spinner.style.borderTop = '3px solid #3498db';
    spinner.style.borderRadius = '50%';
    spinner.style.margin = '0 auto 10px';
    spinner.style.animation = 'spin 1s linear infinite';

    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    loadingOverlay.appendChild(spinner);
    loadingOverlay.appendChild(document.createTextNode('Capturing panoramas...'));
    container.appendChild(loadingOverlay);

    this.loadingOverlays.set(containerId, loadingOverlay);
    return loadingOverlay;
  }

  private setVisibility(containerId: string, showRenderer: boolean): void {
    const container = this.containers.get(containerId);
    if (!container) return;

    const renderer = this.renderers.get(containerId);
    const overlay = this.overlays.get(containerId);

    if (renderer) {
      renderer.domElement.style.display = 'block';
    }

    if (overlay) {
      overlay.style.display = showRenderer ? 'none' : 'block';
    }
  }

  private setupCenterObserver(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Create a new Intersection Observer to detect when panoramas are centered
    this.centerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const containerId = entry.target.id;

          // Check if the panorama is centered (intersection ratio is above threshold)
          if (entry.isIntersecting && entry.intersectionRatio >= this.centerThreshold) {
            console.log(`Panorama ${containerId} is centered in viewport`);

            // Only activate if it's not already the active panorama
            if (this.activePanoramaId !== containerId) {
              // Get the container element
              const container = this.containers.get(containerId);
              if (container) {
                // Simulate a dragstart event to activate the panorama
                const dragEvent = new DragEvent('dragstart', {
                  bubbles: true,
                  cancelable: true
                });
                container.dispatchEvent(dragEvent);
              }
            }
          }
        });
      },
      {
        root: null, // Use the viewport as the root
        rootMargin: '0px',
        threshold: [0, 0.25, 0.5, 0.75, 0.8, 0.9, 1.0] // Multiple thresholds for smoother detection
      }
    );
  }

  private async initializePanoramas(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Get the first 5 panorama IDs
    const initialPanoramaIds = this.panoramaOrder.slice(0, 5);

    for (const containerId of initialPanoramaIds) {
      const renderer = this.renderers.get(containerId);
      const scene = this.scenes.get(containerId);
      const camera = this.cameras.get(containerId);
      const canvas = this.canvasElements.get(containerId);
      const texture = this.currentTextures.get(containerId);

      if (!renderer || !scene || !camera || !canvas || !texture) {
        console.warn(`Missing components for initializing panorama ${containerId}`);
        continue;
      }

      // Only show canvas if we have a valid texture
      if (texture.image && texture.image.complete) {
        canvas.style.display = 'block';
        renderer.render(scene, camera);
      } else {
        canvas.style.display = 'none';
      }

      // Stop any ongoing animation if not active
      if (containerId !== this.activePanoramaId) {
        const animationFrame = this.animationFrames.get(containerId);
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          this.animationFrames.delete(containerId);
        }
      }
    }
  }

  async createPanorama(containerId: string, urls: PanoramaUrls): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Add to panorama order
    this.panoramaOrder.push(containerId);

    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

    this.ngZone.runOutsideAngular(async () => {
      // Create scene
      const scene = new THREE.Scene();
      this.scenes.set(containerId, scene);

      // Create camera
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100);
      camera.position.set(0, 0, 0.1);
      this.cameras.set(containerId, camera);

      // Get container
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Container with id ${containerId} not found`);
        return;
      }

      // Store container reference
      this.containers.set(containerId, container);

      // Initialize center observer if not already done
      if (!this.centerObserver) {
        this.setupCenterObserver();
      }

      // Observe this container for center detection
      if (this.centerObserver) {
        this.centerObserver.observe(container);
      }

      // Create overlay with initial state
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = '10px';
      overlay.style.right = '10px';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      overlay.style.color = 'white';
      overlay.style.padding = '5px 10px';
      overlay.style.borderRadius = '4px';
      overlay.style.fontSize = '12px';
      overlay.style.zIndex = '1000';
      overlay.style.display = 'block';
      overlay.textContent = this.isDesktop() ? 'Drag to interact' : 'Touch to interact';
      container.appendChild(overlay);
      this.overlays.set(containerId, overlay);

      // Create canvas element dynamically
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.zIndex = '1';
      // canvas.style.display = 'none'; // Initially hidden
      container.appendChild(canvas);
      this.canvasElements.set(containerId, canvas);

      // Create renderer with the canvas
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderers.set(containerId, renderer);

      // Create controls
      const controls = new OrbitControls(camera, canvas);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.rotateSpeed = -0.5;
      this.controls.set(containerId, controls);

      // Load initial tiny texture
      await this.loadTexture(containerId, urls.tiny, scene, false);

      // Setup intersection observer for progressive loading
      this.setupIntersectionObserver(containerId, urls, scene);

      // Setup hover handlers
      this.setupHoverHandlers(containerId, scene, camera, renderer, controls);

      // Initialize visibility state
      this.isVisible.set(containerId, false);
      this.setVisibility(containerId, false);

      // After creating the panorama, check if we should initialize the first 5 panoramas
      if (this.panoramaOrder.length === 5) {
        await this.initializePanoramas();
      }
    });
  }

  // New method to activate a panorama
  private activatePanorama(containerId: string): void {
    console.log(`Activating panorama ${containerId}`);

    // Set as active panorama
    this.activePanoramaId = containerId;
    this.isHovered.set(containerId, true);

    // Get necessary components
    const container = this.containers.get(containerId);
    const canvas = this.canvasElements.get(containerId);
    const scene = this.scenes.get(containerId);
    const camera = this.cameras.get(containerId);
    const renderer = this.renderers.get(containerId);
    const controls = this.controls.get(containerId);

    if (!container || !canvas || !scene || !camera || !renderer || !controls) {
      console.error(`Missing components for activating panorama ${containerId}`);
      return;
    }

    // Add canvas to DOM
    if (!canvas.parentNode) {
      container.appendChild(canvas);
    }

    // Set visibility
    this.setVisibility(containerId, true);

    // Start rendering
    const animate = () => {
      if (!this.isHovered.get(containerId)) {
        this.animationFrames.delete(containerId);
        return;
      }
      this.animationFrames.set(
        containerId,
        requestAnimationFrame(animate)
      );
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Capture screenshots for the next three panoramas after a delay
    setTimeout(async () => {
      if (!this.capturedPanoramas.has(containerId)) {
        await this.captureNextThreeScreenshots();
      }
    }, 1000);
  }

  private setupHoverHandlers(
    containerId: string,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    controls: any
  ): void {
    const container = this.containers.get(containerId);
    if (!container) return;

    const startRendering = async () => {
      console.log(`Starting rendering for panorama ${containerId}`);

      // Deactivate any other active panorama
      if (this.activePanoramaId && this.activePanoramaId !== containerId) {
        const otherContainer = this.containers.get(this.activePanoramaId);
        if (otherContainer) {
          const otherRenderer = this.renderers.get(this.activePanoramaId);
          const otherOverlay = this.overlays.get(this.activePanoramaId);

          // Stop animation for other panorama
          this.stopRendering(this.activePanoramaId);

          // Hide other panorama's renderer
          this.setVisibility(this.activePanoramaId, false);

          // Show other panorama's overlay with replacement message
          if (otherOverlay) {
            otherOverlay.textContent = this.isDesktop() ? 'Drag to interact' : 'Touch to interact';
            otherOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            otherOverlay.style.transition = 'background-color 0.3s ease';
            setTimeout(() => {
              if (otherOverlay) {
                otherOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
              }
            }, 1000);
          }
        }
      }

      // Set this panorama as active
      this.activePanoramaId = containerId;
      this.isHovered.set(containerId, true);

      // Show renderer and hide overlay
      this.setVisibility(containerId, true);

      // Add canvas to DOM
      const canvas = this.canvasElements.get(containerId);
      if (canvas) {
        console.log(`Adding canvas for panorama ${containerId} to DOM`);
        // Remove from parent if it exists (to avoid duplicates)
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        // Add to container
        container.appendChild(canvas);
      } else {
        console.error(`Canvas not found for panorama ${containerId}`);
      }

      // Start rendering immediately
      this.startRendering(containerId);
    };

    const stopRendering = async () => {
      console.log(`Stopping rendering for panorama ${containerId}`);
      this.isHovered.set(containerId, false);

      // If this was the active panorama, clear the active state
      if (this.activePanoramaId === containerId) {
        this.activePanoramaId = null;
      }

      // Only stop rendering if panorama is not centered
      if (!this.isPanoramaCentered(containerId)) {
        this.stopRendering(containerId);
        // Hide renderer and show overlay
        this.setVisibility(containerId, false);

        // Remove canvas from DOM
        const canvas = this.canvasElements.get(containerId);
        if (canvas && canvas.parentNode) {
          console.log(`Removing canvas for panorama ${containerId} from DOM`);
          canvas.parentNode.removeChild(canvas);
        }
      }
    };

    // Check if we're on desktop
    if (this.isDesktop()) {
      // Desktop version - use drag events
      container.setAttribute('draggable', 'true');

      // Add mousedown event to start rendering immediately
      container.addEventListener('dragstart', (e) => {
        e.preventDefault();
        startRendering();
      });

      container.addEventListener('dragend', async (e) => {
        e.preventDefault();
        stopRendering();
      });

      container.addEventListener('drag', (e) => {
        e.preventDefault();
      });
    } else {
      // Mobile version - use touch/mouse events
      container.addEventListener('mouseenter', startRendering);
      container.addEventListener('mouseleave', stopRendering);
      container.addEventListener('touchstart', startRendering);
      container.addEventListener('touchend', stopRendering);
    }
  }

  private isDesktop(): boolean {
    return window.innerWidth >= 768; // You can adjust this breakpoint as needed
  }

  /**
   * Compresses an image to a lower quality and size
   * @param base64Image The base64 image string to compress
   * @param maxWidth Maximum width of the compressed image
   * @param maxHeight Maximum height of the compressed image
   * @param quality JPEG quality (0-1)
   * @returns Promise with the compressed base64 image
   */
  private compressImage(
    base64Image: string,
    maxWidth: number = 800,
    maxHeight: number = 600,
    quality: number = 0.3
  ): Promise<string> {
    return new Promise((resolve) => {
      if (!isPlatformBrowser(this.platformId)) {
        resolve(base64Image);
        return;
      }

      this.ngZone.runOutsideAngular(() => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(base64Image);
            return;
          }

          // Use lower quality rendering for better compression
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'low';

          // Draw the image
          ctx.drawImage(img, 0, 0, width, height);

          // Get compressed image
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };

        img.onerror = () => {
          console.error('Error loading image for compression');
          resolve(base64Image);
        };

        img.src = base64Image;
      });
    });
  }

  async takeScreenshot(containerId: string, quality: number = 0.8): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }

    return new Promise((resolve) => {
      this.ngZone.runOutsideAngular(() => {
        const renderer = this.renderers.get(containerId);
        const scene = this.scenes.get(containerId);
        const camera = this.cameras.get(containerId);
        const container = this.containers.get(containerId);
        const canvas = this.canvasElements.get(containerId);

        if (!renderer || !scene || !camera || !container || !canvas) {
          console.error(`Missing components for screenshot of panorama ${containerId}`);
          resolve('');
          return;
        }

        // Ensure canvas is in the DOM and visible
        if (!canvas.parentNode) {
          container.appendChild(canvas);
        }
        canvas.style.display = 'block';

        // Force one render
        renderer.render(scene, camera);

        // Get the base64 image with specified quality
        const base64 = canvas.toDataURL('image/jpeg', quality);

        // Hide canvas after taking screenshot
        // canvas.style.display = 'none';

        resolve(base64);
      });
    });
  }

  private loadTexture(containerId: string, imageUrl: string, scene: THREE.Scene, isHighQuality: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const textureLoader = new THREE.TextureLoader();
      console.log(`Loading ${isHighQuality ? 'high' : 'tiny'} quality texture from: ${imageUrl}`);

      textureLoader.load(
        imageUrl,
        (texture) => {
          console.log(`Successfully loaded ${isHighQuality ? 'high' : 'tiny'} quality texture for ${containerId}`);
          texture.colorSpace = THREE.SRGBColorSpace;

          // If we already have a texture, update the existing material
          const existingTexture = this.currentTextures.get(containerId);
          if (existingTexture) {
            const sphere = scene.children[0] as THREE.Mesh;
            if (sphere && sphere.material instanceof THREE.MeshBasicMaterial) {
              sphere.material.map = texture;
              sphere.material.needsUpdate = true;
            }
          } else {
            // Create new sphere with texture
            const geometry = new THREE.SphereGeometry(500, 60, 40);
            geometry.scale(-1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ map: texture });
            const sphere = new THREE.Mesh(geometry, material);
            scene.add(sphere);
          }

          this.currentTextures.set(containerId, texture);

          // Show canvas only after texture is loaded
          const canvas = this.canvasElements.get(containerId);
          if (canvas) {
            canvas.style.display = 'block';
            const renderer = this.renderers.get(containerId);
            const scene = this.scenes.get(containerId);
            const camera = this.cameras.get(containerId);
            if (renderer && scene && camera) {
              renderer.render(scene, camera);
            }
          }

          resolve();
        },
        (xhr) => {
          console.log(`${containerId}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        (error) => {
          console.error(`Error loading texture for ${containerId}:`, error);
          if (!this.currentTextures.get(containerId)) {
            const geometry = new THREE.SphereGeometry(500, 60, 40);
            geometry.scale(-1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const sphere = new THREE.Mesh(geometry, material);
            scene.add(sphere);
          }
          reject(error);
        }
      );
    });
  }

  private setupIntersectionObserver(containerId: string, urls: PanoramaUrls, scene: THREE.Scene): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Load high quality texture when panorama comes into view
            this.loadTexture(containerId, urls.high, scene, true);
            // Disconnect observer after loading high quality texture
            observer.disconnect();
            this.observers.delete(containerId);
          }
        });
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    observer.observe(container);
    this.observers.set(containerId, observer);
  }

  destroyPanorama(containerId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      // If this was the active panorama, clear the active state
      if (this.activePanoramaId === containerId) {
        this.activePanoramaId = null;
      }

      // Remove from captured panoramas
      this.capturedPanoramas.delete(containerId);

      // Stop rendering if active
      const animationFrame = this.animationFrames.get(containerId);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        this.animationFrames.delete(containerId);
      }

      // Cleanup intersection observer
      const observer = this.observers.get(containerId);
      if (observer) {
        observer.disconnect();
        this.observers.delete(containerId);
      }

      // Cleanup center observer
      if (this.centerObserver) {
        const container = this.containers.get(containerId);
        if (container) {
          this.centerObserver.unobserve(container);
        }
      }

      // Cleanup texture
      const texture = this.currentTextures.get(containerId);
      if (texture) {
        texture.dispose();
        this.currentTextures.delete(containerId);
      }

      // Cleanup overlay
      const overlay = this.overlays.get(containerId);
      if (overlay) {
        overlay.remove();
        this.overlays.delete(containerId);
      }

      // Cleanup loading overlay
      const loadingOverlay = this.loadingOverlays.get(containerId);
      if (loadingOverlay) {
        loadingOverlay.remove();
        this.loadingOverlays.delete(containerId);
      }

      // Cleanup canvas element
      const canvas = this.canvasElements.get(containerId);
      if (canvas) {
        // Remove from DOM if it's there
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        this.canvasElements.delete(containerId);
      }

      const renderer = this.renderers.get(containerId);
      if (renderer) {
        renderer.dispose();
        this.renderers.delete(containerId);
      }

      this.scenes.delete(containerId);
      this.cameras.delete(containerId);
      this.controls.delete(containerId);
      this.isHovered.delete(containerId);
      this.containers.delete(containerId);
      this.isVisible.delete(containerId);
    });
  }

  async captureNextThreeScreenshots(): Promise<void> {
    if (!this.activePanoramaId) {
      console.warn('No active panorama to capture next screenshots from');
      return;
    }

    const activeIndex = this.panoramaOrder.indexOf(this.activePanoramaId);
    if (activeIndex === -1) {
      console.warn('Active panorama not found in order list');
      return;
    }

    // Get the previous 3 and next 3 panorama IDs
    const previousThreeIds = this.panoramaOrder.slice(Math.max(0, activeIndex - 3), activeIndex);
    const nextThreeIds = this.panoramaOrder.slice(activeIndex + 1, activeIndex + 6);

    // Combine previous and next panoramas to capture
    const panoramasToCapture = [...previousThreeIds, ...nextThreeIds];

    for (const panoramaId of panoramasToCapture) {
      // Skip if this panorama has already been captured
      if (this.capturedPanoramas.has(panoramaId)) {
        console.log(`Skipping already captured panorama: ${panoramaId}`);
        continue;
      }

      const renderer = this.renderers.get(panoramaId);
      const scene = this.scenes.get(panoramaId);
      const camera = this.cameras.get(panoramaId);
      const overlay = this.overlays.get(panoramaId);

      if (!renderer || !scene || !camera || !overlay) {
        console.warn(`Missing components for panorama ${panoramaId}`);
        continue;
      }

      // Show loading overlay for this panorama
      const loadingOverlay = this.loadingOverlays.get(panoramaId) ||
        this.createLoadingOverlay(panoramaId);
      loadingOverlay.style.display = 'block';
      loadingOverlay.lastChild!.textContent = 'Capturing panorama...';

      // Set loading state to true
      this.setLoadingState(panoramaId, true);

      try {
        // Take screenshot with medium quality first
        const base64Image = await this.takeScreenshot(panoramaId, 0.6);

        // Compress the image to a lower quality and size
        const compressedImage = await this.compressImage(
          base64Image,
          800,  // max width
          600,  // max height
          0.2   // very low quality for static images
        );

        // Update overlay
        overlay.style.display = 'block';
        overlay.textContent = 'Static view - ' + (this.isDesktop() ? 'Drag to interact' : 'Touch to interact');
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.transition = 'background-color 0.3s ease';
        setTimeout(() => {
          if (overlay) {
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          }
        }, 1000);

        // Mark this panorama as captured
        this.capturedPanoramas.add(panoramaId);
      } finally {
        // Hide loading overlay
        loadingOverlay.style.display = 'none';

        // Set loading state to false
        this.setLoadingState(panoramaId, false);
      }
    }
  }

  // Public method to manually check if a panorama is centered
  isPanoramaCentered(containerId: string): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const container = this.containers.get(containerId);
    if (!container) {
      return false;
    }

    const rect = container.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    // Calculate how much of the element is visible in the viewport
    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);

    // Calculate the intersection ratio
    const intersectionRatio = (visibleHeight * visibleWidth) / (rect.height * rect.width);

    // Return true if the intersection ratio is above the threshold
    return intersectionRatio >= this.centerThreshold;
  }

  // Public method to directly set a panorama as active
  setActivePanorama(containerId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    console.log(`Setting panorama ${containerId} as active directly`);

    // Get necessary components
    const container = this.containers.get(containerId);
    const canvas = this.canvasElements.get(containerId);
    const scene = this.scenes.get(containerId);
    const camera = this.cameras.get(containerId);
    const renderer = this.renderers.get(containerId);
    const controls = this.controls.get(containerId);

    if (!container || !canvas || !scene || !camera || !renderer || !controls) {
      console.error(`Missing components for activating panorama ${containerId}`);
      return;
    }

    // Deactivate any other active panorama
    if (this.activePanoramaId && this.activePanoramaId !== containerId) {
      this.isHovered.set(this.activePanoramaId, false);

      // Stop animation for other panorama
      const otherAnimationFrame = this.animationFrames.get(this.activePanoramaId);
      if (otherAnimationFrame) {
        cancelAnimationFrame(otherAnimationFrame);
        this.animationFrames.delete(this.activePanoramaId);
      }
    }

    // Set as active panorama
    this.activePanoramaId = containerId;
    this.isHovered.set(containerId, true);

    // Add canvas to DOM
    if (!canvas.parentNode) {
      container.appendChild(canvas);
    }

    // Set visibility
    this.setVisibility(containerId, true);

    // Start rendering
    const animate = () => {
      if (!this.isHovered.get(containerId)) {
        this.animationFrames.delete(containerId);
        return;
      }
      this.animationFrames.set(
        containerId,
        requestAnimationFrame(animate)
      );
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  }

  private startRendering(containerId: string): void {
    const renderer = this.renderers.get(containerId);
    const scene = this.scenes.get(containerId);
    const camera = this.cameras.get(containerId);
    const controls = this.controls.get(containerId);

    if (!renderer || !scene || !camera || !controls) {
      return;
    }

    const animate = () => {
      // Only continue animation if panorama is hovered or centered
      if (!this.isHovered.get(containerId) && !this.isPanoramaCentered(containerId)) {
        this.animationFrames.delete(containerId);
        return;
      }
      this.animationFrames.set(
        containerId,
        requestAnimationFrame(animate)
      );
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  }

  private stopRendering(containerId: string): void {
    const animationFrame = this.animationFrames.get(containerId);
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      this.animationFrames.delete(containerId);
    }
  }
}
