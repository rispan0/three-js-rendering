import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PanoramaService } from '../../services/panorama.service';

interface PanoramaItem {
  high: string;
  tiny: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-panorama-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panorama-viewer.component.html',
  styleUrls: ['./panorama-viewer.component.scss']
})
export class PanoramaViewerComponent implements OnInit, OnDestroy {
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

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      // Create a queue to process panoramas sequentially
      const queuePanorama = async (index: number) => {
        const containerId = `panorama-container-${index}`;
        this.loadingStatus[containerId] = true;
        this.errorStatus[containerId] = false;
        this.captureLoadingStatus[containerId] = false;
        this.isVisible[containerId] = false;

        try {
          // Create the panorama
          await this.panoramaService.createPanorama(containerId, this.panoramaUrls[index]);

          // Subscribe to loading state changes
          this.subscriptions[containerId] = this.panoramaService.getLoadingState(containerId).subscribe(isLoading => {
            this.captureLoadingStatus[containerId] = isLoading;
          });

          this.loadingStatus[containerId] = false;
        } catch (error) {
          console.error(`Error creating panorama ${containerId}:`, error);
          this.errorStatus[containerId] = true;
          this.loadingStatus[containerId] = false;
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
  }
}
