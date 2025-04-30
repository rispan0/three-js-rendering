import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PanoramaService } from '../../services/panorama.service';
import { VirtualScrollDirective, VirtualItemRenderEventDetail } from '../../directives/virtual-scroll.directive';
import { Subscription } from 'rxjs';

interface PanoramaItem {
  high: string;
  tiny: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-virtual-panorama-viewer',
  standalone: true,
  imports: [CommonModule, VirtualScrollDirective],
  template: `
    <div class="panorama-viewer">
      <div class="panorama-container" 
           appVirtualScroll 
           [totalItems]="panoramaUrls.length"
           [itemHeight]="700"
           [bufferSize]="2"
           (virtualItemRender)="onVirtualItemRender($event)">
        <!-- Virtual items will be inserted here by the directive -->
      </div>
    </div>
  `,
  styles: [`
    .panorama-viewer {
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }
    
    .panorama-container {
      width: calc(100vw - 400px);
      height: 100%;
      margin: 0 auto;
      padding: 80px 0;
    }
    
    .panorama-item {
      display: flex;
      flex-direction: column;
      width: 100%;
      transition: transform 0.3s ease;
    }
    
    .panorama-item.centered {
      transform: scale(1.02);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }
    
    .panorama-container {
      position: relative;
      width: 100%;
      height: 700px;
      border-radius: 8px 8px 0 0;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .panorama-info {
      padding: 15px;
      background-color: #f8f8f8;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .panorama-title {
      margin: 0 0 10px 0;
      font-size: 1.4rem;
      font-weight: 600;
      color: #333;
    }
    
    .panorama-description {
      margin: 0;
      font-size: 1rem;
      color: #666;
      line-height: 1.5;
    }
    
    .loading-overlay,
    .error-overlay,
    .capture-loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      z-index: 20;
    }
    
    .error-overlay {
      background-color: rgba(255, 0, 0, 0.3);
    }
    
    .error-details {
      font-size: 0.8rem;
      opacity: 0.8;
      margin-top: 5px;
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 10px;
    }
    
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class VirtualPanoramaViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(VirtualScrollDirective) virtualScroll!: VirtualScrollDirective;

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
      high: 'assets/panorama-quality/5-high.jpg',
      tiny: 'assets/panorama-quality/5-tiny.jpg',
      title: 'Desert Dunes',
      description: 'Vast desert landscape with rolling sand dunes'
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
      high: 'assets/panorama-quality/4-high.jpg',
      tiny: 'assets/panorama-quality/4-tiny.jpg',
      title: 'Forest Path',
      description: 'Serene forest trail surrounded by ancient trees'
    },
  ];

  // Track loading status
  loadingStatus: { [key: string]: boolean } = {};
  errorStatus: { [key: string]: boolean } = {};
  littlePlanetMode: { [key: string]: boolean } = {};
  captureLoadingStatus: { [key: string]: boolean } = {};
  isVisible: { [key: string]: boolean } = {};

  private subscriptions: { [key: string]: any } = {};

  constructor(
    private panoramaService: PanoramaService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    // Initialize loading states and create panoramas
    this.panoramaUrls.forEach((panorama, index) => {
      const containerId = `panorama-container-${index}`;
      this.loadingStatus[containerId] = false;
      this.errorStatus[containerId] = false;
      this.captureLoadingStatus[containerId] = false;
      this.isVisible[containerId] = false;

      // Create panorama for each item
      this.panoramaService.createPanorama(containerId, panorama)
        .then(() => {
          // Subscribe to loading state changes
          this.subscriptions[containerId] = this.panoramaService.getLoadingState(containerId).subscribe(isLoading => {
            this.captureLoadingStatus[containerId] = isLoading;
          });

          // Set initial visibility
          if (index === 0) {
            // First panorama is visible by default
            this.panoramaService.setActivePanorama(containerId);
          }
        })
        .catch(error => {
          console.error(`Error creating panorama ${containerId}:`, error);
          this.errorStatus[containerId] = true;
        });
    });
  }

  ngAfterViewInit(): void {
    // Additional initialization if needed
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    Object.keys(this.subscriptions).forEach(key => {
      if (this.subscriptions[key]) {
        this.subscriptions[key].unsubscribe();
      }
    });

    // Clean up panoramas and canvas elements
    if (isPlatformBrowser(this.platformId)) {
      this.panoramaUrls.forEach((_, index) => {
        const containerId = `panorama-container-${index}`;
        this.panoramaService.destroyPanorama(containerId);
      });
    }
  }

  /**
   * Handle virtual item render events
   * @param event The virtual item render event
   */
  onVirtualItemRender(event: VirtualItemRenderEventDetail): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const { index, element } = event;
    const panorama = this.panoramaUrls[index];
    const containerId = `panorama-container-${index}`;

    // Create the panorama item structure
    element.innerHTML = `
      <div class="panorama-item ${this.isPanoramaCentered(index) ? 'centered' : ''}">
        <div id="${containerId}" class="panorama-container">
          <!-- Canvas is already initialized -->
          ${this.loadingStatus[containerId] ? `
            <div class="loading-overlay">
              <div class="spinner"></div>
              <p>Loading panorama...</p>
            </div>
          ` : ''}
          ${this.errorStatus[containerId] ? `
            <div class="error-overlay">
              <p>Error loading panorama</p>
              <p class="error-details">Please check the console for details</p>
            </div>
          ` : ''}
          ${this.captureLoadingStatus[containerId] ? `
            <div class="capture-loading-overlay">
              <div class="spinner"></div>
              <p>Capturing panorama...</p>
            </div>
          ` : ''}
        </div>
        <div class="panorama-info">
          <h3 class="panorama-title">${panorama.title}</h3>
          <p class="panorama-description">${panorama.description}</p>
        </div>
      </div>
    `;

    // Update visibility based on centering
    if (this.isPanoramaCentered(index)) {
      this.panoramaService.setActivePanorama(containerId);
    } else if (index < 5) {
      // For the first 5 panoramas, ensure they have their canvas visibility set
      this.panoramaService.setVisibility(containerId, false);
    }
  }

  /**
   * Check if a panorama is centered in the viewport
   * @param index The index of the panorama to check
   */
  isPanoramaCentered(index: number): boolean {
    if (!this.virtualScroll) return false;
    return this.virtualScroll.isItemCentered(index);
  }

  /**
   * Scroll to a specific panorama
   * @param index The index of the panorama to scroll to
   */
  scrollToPanorama(index: number): void {
    if (!this.virtualScroll) return;
    this.virtualScroll.scrollToItem(index);
  }
} 