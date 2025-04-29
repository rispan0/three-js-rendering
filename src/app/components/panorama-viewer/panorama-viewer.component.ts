import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PanoramaService } from '../../services/panorama.service';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { BehaviorSubject, fromEvent, Subject, debounceTime } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface PanoramaItem {
  high: string;
  tiny: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-panorama-viewer',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './panorama-viewer.component.html',
  styleUrls: ['./panorama-viewer.component.scss']
})
export class PanoramaViewerComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  // Using a placeholder image for testing
  // In a real application, you would use actual panorama images
  placeholderImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkLzYvLy0vLi44QjQ4OEI4Li8vQUVFRUVFRUVFRUVFRUVFRUVFRUX/2wBDAR0XFyAeIBogHiAeIBogICAgICAgICAgICggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICD/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

  // Define panorama URLs with fallbacks
  panoramaUrls: PanoramaItem[] = [
    {
      high: 'assets/panorama-quality/1-high.jpg',
      tiny: 'assets/panorama-quality/1-tiny.jpg',
      title: 'Mountain View',
      description: 'A breathtaking view of the mountain range at sunset'
    },
    {
      high: 'assets/panorama-quality/2-high.jpg',
      tiny: 'assets/panorama-quality/2-tiny.jpg',
      title: 'Beach Sunset',
      description: 'Relaxing beach view with golden sunset colors'
    },
    {
      high: 'assets/panorama-quality/3-high.jpg',
      tiny: 'assets/panorama-quality/3-tiny.jpg',
      title: 'City Skyline',
      description: 'Modern city architecture against the night sky'
    },
    {
      high: 'assets/panorama-quality/4-high.jpg',
      tiny: 'assets/panorama-quality/4-tiny.jpg',
      title: 'Forest Path',
      description: 'Serene forest trail surrounded by ancient trees'
    },
    {
      high: 'assets/panorama-quality/6-high.jpg',
      tiny: 'assets/panorama-quality/6-tiny.jpg',
      title: 'Ocean Waves',
      description: 'Powerful waves crashing against rocky cliffs'
    },
    {
      high: 'assets/panorama-quality/1-high.jpg',
      tiny: 'assets/panorama-quality/1-tiny.jpg',
      title: 'Mountain View',
      description: 'A breathtaking view of the mountain range at sunset'
    },
    {
      high: 'assets/panorama-quality/2-high.jpg',
      tiny: 'assets/panorama-quality/2-tiny.jpg',
      title: 'Beach Sunset',
      description: 'Relaxing beach view with golden sunset colors'
    },
    {
      high: 'assets/panorama-quality/3-high.jpg',
      tiny: 'assets/panorama-quality/3-tiny.jpg',
      title: 'City Skyline',
      description: 'Modern city architecture against the night sky'
    },
    {
      high: 'assets/panorama-quality/4-high.jpg',
      tiny: 'assets/panorama-quality/4-tiny.jpg',
      title: 'Forest Path',
      description: 'Serene forest trail surrounded by ancient trees'
    },
    {
      high: 'assets/panorama-quality/6-high.jpg',
      tiny: 'assets/panorama-quality/6-tiny.jpg',
      title: 'Ocean Waves',
      description: 'Powerful waves crashing against rocky cliffs'
    },
  ];

  // Track loading status
  loadingStatus: { [key: string]: boolean } = {};
  errorStatus: { [key: string]: boolean } = {};
  littlePlanetMode: { [key: string]: boolean } = {};
  captureLoadingStatus: { [key: string]: boolean } = {};
  isVisible: { [key: string]: boolean } = {};
  isRendered: { [key: string]: boolean } = {};

  private subscriptions: { [key: string]: any } = {};
  private panoramaElements: { [key: string]: HTMLElement } = {};

  // Track rendering queue and current rendering status
  private renderingQueue: number[] = [];
  private isRendering = false;
  private currentRenderingIndex = -1;
  private renderingComplete = new BehaviorSubject<boolean>(true);
  private destroy$ = new Subject<void>();
  private visibleIndices: Set<number> = new Set();

  // Maximum number of elements to render at once
  private maxVisibleElements = 8;
  // Current scroll position
  private currentScrollPosition = 0;

  constructor(
    private panoramaService: PanoramaService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && this.viewport) {
      // Subscribe to scroll events to detect visible items
      fromEvent(this.viewport.elementRef.nativeElement, 'scroll')
        .pipe(
          debounceTime(100),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.currentScrollPosition = this.viewport.elementRef.nativeElement.scrollTop;
          this.updateVisibleItems();
        });

      // Initial check for visible items
      setTimeout(() => this.updateVisibleItems(), 500);
    }
  }

  // Update the list of visible items based on viewport
  private updateVisibleItems(): void {
    if (!this.viewport) return;

    const viewportElement = this.viewport.elementRef.nativeElement;
    const viewportRect = viewportElement.getBoundingClientRect();
    const itemHeight = 420; // Height of each panorama item

    // Calculate the current index based on scroll position
    const currentIndex = Math.floor(this.currentScrollPosition / itemHeight);

    // Update visible indices - ensure exactly maxVisibleElements are rendered
    this.visibleIndices.clear();

    // Calculate the range of indices to render
    // We want to render exactly maxVisibleElements centered around the current index
    const halfMax = Math.floor(this.maxVisibleElements);
    const start = Math.max(0, currentIndex - halfMax);
    const end = Math.min(this.panoramaUrls.length - 1, start + this.maxVisibleElements - 1);

    // Add exactly maxVisibleElements or all remaining elements if less than maxVisibleElements
    for (let i = start; i <= end; i++) {
      this.visibleIndices.add(i);

      // If this item is visible but not rendered, add it to the queue
      if (!this.isRendered[`panorama-container-${i}`]) {
        this.addToRenderingQueue(i);
      }
    }

    // Process the rendering queue
    this.processRenderingQueue();
  }

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      // Create a queue to process panoramas sequentially
      const queuePanorama = async (index: number) => {
        const containerId = `panorama-container-${index}`;
        this.loadingStatus[containerId] = true;
        this.errorStatus[containerId] = false;
        this.captureLoadingStatus[containerId] = false;
        this.isVisible[containerId] = false;
        this.isRendered[containerId] = false;

        try {
          // Create the panorama
          await this.panoramaService.createPanorama(containerId, this.panoramaUrls[index]);

          // Subscribe to loading state changes
          this.subscriptions[containerId] = this.panoramaService.getLoadingState(containerId).subscribe(isLoading => {
            this.captureLoadingStatus[containerId] = isLoading;
          });

          this.loadingStatus[containerId] = false;
          this.isRendered[containerId] = true;
        } catch (error) {
          console.error(`Error creating panorama ${containerId}:`, error);
          this.errorStatus[containerId] = true;
          this.loadingStatus[containerId] = false;
          this.isRendered[containerId] = false;
        }
      };

      // Process all panoramas in sequence
      for (let i = 0; i < this.panoramaUrls.length; i++) {
        await queuePanorama(i);
      }

      // Activate the first panorama after all panoramas are created
      setTimeout(() => {
        if (this.panoramaUrls.length > 0) {
          const firstPanoramaId = `panorama-container-0`;
          console.log(`Activating first panorama ${firstPanoramaId} directly`);

          // Directly activate the first panorama
          this.activateFirstPanorama(firstPanoramaId);
        }
      }, 500); // Wait a bit to ensure all panoramas are fully initialized
    }
  }

  // New method to directly activate the first panorama
  private activateFirstPanorama(containerId: string): void {
    // Directly activate the panorama using the service method
    this.panoramaService.setActivePanorama(containerId);
  }

  // Method to handle panorama visibility changes
  onPanoramaVisibilityChange(index: number, isVisible: boolean): void {
    const containerId = `panorama-container-${index}`;
    this.isVisible[containerId] = isVisible;

    if (isVisible) {
      // Add to rendering queue if not already being rendered
      this.addToRenderingQueue(index);
    }
  }

  // Add an index to the rendering queue
  private addToRenderingQueue(index: number): void {
    if (!this.renderingQueue.includes(index) && this.currentRenderingIndex !== index) {
      this.renderingQueue.push(index);
      this.processRenderingQueue();
    }
  }

  // Process the rendering queue sequentially
  private async processRenderingQueue(): Promise<void> {
    // If already rendering or queue is empty, return
    if (this.isRendering || this.renderingQueue.length === 0) {
      return;
    }

    this.isRendering = true;
    this.renderingComplete.next(false);

    // Get the next index to render
    const nextIndex = this.renderingQueue.shift();
    if (nextIndex !== undefined) {
      this.currentRenderingIndex = nextIndex;
      await this.initializePanorama(nextIndex);
    }

    this.isRendering = false;
    this.currentRenderingIndex = -1;
    this.renderingComplete.next(true);

    // Process next item in queue if any
    if (this.renderingQueue.length > 0) {
      setTimeout(() => this.processRenderingQueue(), 100);
    }
  }

  // Method to initialize a panorama
  private async initializePanorama(index: number): Promise<void> {
    const containerId = `panorama-container-${index}`;

    // Clean up existing panorama if it exists
    if (this.panoramaElements[containerId]) {
      this.panoramaService.destroyPanorama(containerId);
      delete this.panoramaElements[containerId];
    }

    // Reset loading states
    this.loadingStatus[containerId] = true;
    this.errorStatus[containerId] = false;
    this.captureLoadingStatus[containerId] = false;
    this.isRendered[containerId] = false;

    try {
      // Create the panorama
      await this.panoramaService.createPanorama(containerId, this.panoramaUrls[index]);

      // Store the panorama element
      const element = document.getElementById(containerId);
      if (element) {
        this.panoramaElements[containerId] = element;
      }

      // Subscribe to loading state changes
      if (this.subscriptions[containerId]) {
        this.subscriptions[containerId].unsubscribe();
      }

      this.subscriptions[containerId] = this.panoramaService.getLoadingState(containerId).subscribe(isLoading => {
        this.captureLoadingStatus[containerId] = isLoading;
      });

      this.loadingStatus[containerId] = false;
      this.isRendered[containerId] = true;
    } catch (error) {
      console.error(`Error initializing panorama ${containerId}:`, error);
      this.errorStatus[containerId] = true;
      this.loadingStatus[containerId] = false;
      this.isRendered[containerId] = false;
    }
  }

  // Method to check if rendering is complete
  isRenderingComplete(): boolean {
    return this.renderingComplete.value;
  }

  // Method to check if all visible items are rendered
  areAllVisibleItemsRendered(): boolean {
    for (const index of this.visibleIndices) {
      const containerId = `panorama-container-${index}`;
      if (!this.isRendered[containerId]) {
        return false;
      }
    }
    return true;
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    Object.keys(this.subscriptions).forEach(key => {
      if (this.subscriptions[key]) {
        this.subscriptions[key].unsubscribe();
      }
    });

    // Clean up panoramas
    if (isPlatformBrowser(this.platformId)) {
      this.panoramaUrls.forEach((_, index) => {
        const containerId = `panorama-container-${index}`;
        this.panoramaService.destroyPanorama(containerId);
      });
    }

    // Complete the destroy subject
    this.destroy$.next();
    this.destroy$.complete();
  }
}
