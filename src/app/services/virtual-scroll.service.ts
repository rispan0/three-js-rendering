import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface VirtualScrollOptions {
    itemHeight: number;
    containerHeight: number;
    bufferSize: number;
}

export interface VirtualScrollState {
    startIndex: number;
    endIndex: number;
    visibleItems: number[];
    totalItems: number;
    scrollTop: number;
    isScrolling: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class VirtualScrollService {
    private defaultOptions: VirtualScrollOptions = {
        itemHeight: 100,
        containerHeight: 500,
        bufferSize: 5
    };

    private scrollState = new BehaviorSubject<VirtualScrollState>({
        startIndex: 0,
        endIndex: 0,
        visibleItems: [],
        totalItems: 0,
        scrollTop: 0,
        isScrolling: false
    });

    private scrollTimeout: any;
    private resizeObserver: ResizeObserver | null = null;
    private scrollElement: HTMLElement | null = null;

    constructor() { }

    /**
     * Initialize virtual scrolling for a container element
     * @param containerElement The container element to enable virtual scrolling for
     * @param totalItems Total number of items to scroll through
     * @param options Custom options for virtual scrolling
     */
    initialize(
        containerElement: HTMLElement,
        totalItems: number,
        options: Partial<VirtualScrollOptions> = {}
    ): void {
        this.scrollElement = containerElement;
        const mergedOptions = { ...this.defaultOptions, ...options };

        // Set up scroll event listener
        containerElement.addEventListener('scroll', this.handleScroll.bind(this));

        // Set up resize observer to handle container size changes
        this.setupResizeObserver(containerElement);

        // Calculate initial visible items
        this.updateVisibleItems(containerElement, totalItems, mergedOptions);

        // Update scroll state
        this.scrollState.next({
            ...this.scrollState.value,
            totalItems
        });
    }

    /**
     * Get the current scroll state as an observable
     */
    getScrollState(): Observable<VirtualScrollState> {
        return this.scrollState.asObservable();
    }

    /**
     * Scroll to a specific item index
     * @param index The index to scroll to
     * @param options Custom options for virtual scrolling
     */
    scrollToIndex(index: number, options: Partial<VirtualScrollOptions> = {}): void {
        if (!this.scrollElement) return;

        const mergedOptions = { ...this.defaultOptions, ...options };
        const scrollTop = index * mergedOptions.itemHeight;

        this.scrollElement.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });

        this.scrollState.next({
            ...this.scrollState.value,
            isScrolling: true
        });

        // Reset scrolling flag after animation completes
        setTimeout(() => {
            this.scrollState.next({
                ...this.scrollState.value,
                isScrolling: false
            });
        }, 500);
    }

    /**
     * Check if an item is currently visible in the viewport
     * @param index The item index to check
     */
    isItemVisible(index: number): boolean {
        return this.scrollState.value.visibleItems.includes(index);
    }

    /**
     * Check if an item is centered in the viewport
     * @param index The item index to check
     * @param options Custom options for virtual scrolling
     */
    isItemCentered(index: number, options: Partial<VirtualScrollOptions> = {}): boolean {
        if (!this.scrollElement) return false;

        const mergedOptions = { ...this.defaultOptions, ...options };
        const containerRect = this.scrollElement.getBoundingClientRect();
        const containerCenter = containerRect.top + (containerRect.height / 2);

        const itemElement = this.scrollElement.querySelector(`[data-index="${index}"]`);
        if (!itemElement) return false;

        const itemRect = itemElement.getBoundingClientRect();
        const itemCenter = itemRect.top + (itemRect.height / 2);

        return Math.abs(containerCenter - itemCenter) < (mergedOptions.itemHeight / 2);
    }

    /**
     * Clean up resources when the service is no longer needed
     */
    destroy(): void {
        if (this.scrollElement) {
            this.scrollElement.removeEventListener('scroll', this.handleScroll.bind(this));
            this.scrollElement = null;
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
    }

    /**
     * Handle scroll events and update the scroll state
     */
    private handleScroll(): void {
        if (!this.scrollElement) return;

        this.scrollState.next({
            ...this.scrollState.value,
            isScrolling: true,
            scrollTop: this.scrollElement.scrollTop
        });

        // Update visible items based on current scroll position
        this.updateVisibleItems(
            this.scrollElement,
            this.scrollState.value.totalItems,
            this.defaultOptions
        );

        // Reset scrolling flag after scroll ends
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }

        this.scrollTimeout = setTimeout(() => {
            this.scrollState.next({
                ...this.scrollState.value,
                isScrolling: false
            });
        }, 150);
    }

    /**
     * Set up a resize observer to handle container size changes
     * @param containerElement The container element to observe
     */
    private setupResizeObserver(containerElement: HTMLElement): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        this.resizeObserver = new ResizeObserver(() => {
            this.updateVisibleItems(
                containerElement,
                this.scrollState.value.totalItems,
                this.defaultOptions
            );
        });

        this.resizeObserver.observe(containerElement);
    }

    /**
     * Update the list of visible items based on scroll position
     * @param containerElement The container element
     * @param totalItems Total number of items
     * @param options Virtual scroll options
     */
    private updateVisibleItems(
        containerElement: HTMLElement,
        totalItems: number,
        options: VirtualScrollOptions
    ): void {
        const scrollTop = containerElement.scrollTop;
        const containerHeight = containerElement.clientHeight;

        // Calculate the range of visible items
        const startIndex = Math.max(0, Math.floor(scrollTop / options.itemHeight) - options.bufferSize);
        const endIndex = Math.min(
            totalItems - 1,
            Math.ceil((scrollTop + containerHeight) / options.itemHeight) + options.bufferSize
        );

        // Generate the list of visible item indices
        const visibleItems: number[] = [];
        for (let i = startIndex; i <= endIndex; i++) {
            visibleItems.push(i);
        }

        // Update the scroll state
        this.scrollState.next({
            ...this.scrollState.value,
            startIndex,
            endIndex,
            visibleItems,
            scrollTop
        });
    }
} 