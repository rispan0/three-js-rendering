import { Directive, ElementRef, Input, OnInit, OnDestroy, AfterViewInit, NgZone, Output, EventEmitter } from '@angular/core';
import { VirtualScrollService, VirtualScrollOptions } from '../services/virtual-scroll.service';
import { Subscription } from 'rxjs';

export interface VirtualItemRenderEventDetail {
    index: number;
    element: HTMLElement;
}

@Directive({
    selector: '[appVirtualScroll]',
    standalone: true
})
export class VirtualScrollDirective implements OnInit, AfterViewInit, OnDestroy {
    @Input() totalItems: number = 0;
    @Input() itemHeight: number = 100;
    @Input() bufferSize: number = 5;
    @Output() virtualItemRender = new EventEmitter<VirtualItemRenderEventDetail>();

    private scrollSubscription?: Subscription;
    private visibleItems: number[] = [];

    constructor(
        private el: ElementRef<HTMLElement>,
        private virtualScrollService: VirtualScrollService,
        private ngZone: NgZone
    ) { }

    ngOnInit(): void {
        // Set up the container for virtual scrolling
        this.setupContainer();
    }

    ngAfterViewInit(): void {
        // Initialize virtual scrolling after view init
        this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
                this.initializeVirtualScroll();
            }, 0);
        });
    }

    ngOnDestroy(): void {
        // Clean up resources
        if (this.scrollSubscription) {
            this.scrollSubscription.unsubscribe();
        }

        this.virtualScrollService.destroy();
    }

    /**
     * Set up the container element for virtual scrolling
     */
    private setupContainer(): void {
        const container = this.el.nativeElement;

        // Set required CSS properties
        container.style.overflow = 'auto';
        container.style.position = 'relative';

        // Set the total height of the container to accommodate all items
        const totalHeight = this.totalItems * this.itemHeight;
        container.style.height = '100%';

        // Create a content wrapper to hold the actual items
        const contentWrapper = document.createElement('div');
        contentWrapper.style.position = 'absolute';
        contentWrapper.style.top = '0';
        contentWrapper.style.left = '0';
        contentWrapper.style.right = '0';
        contentWrapper.style.height = `${totalHeight}px`;
        contentWrapper.id = 'virtual-scroll-content';

        // Insert the content wrapper as the first child
        if (container.firstChild) {
            container.insertBefore(contentWrapper, container.firstChild);
        } else {
            container.appendChild(contentWrapper);
        }
    }

    /**
     * Initialize virtual scrolling
     */
    private initializeVirtualScroll(): void {
        const container = this.el.nativeElement;
        const options: Partial<VirtualScrollOptions> = {
            itemHeight: this.itemHeight,
            containerHeight: container.clientHeight,
            bufferSize: this.bufferSize
        };

        // Initialize the virtual scroll service
        this.virtualScrollService.initialize(container, this.totalItems, options);

        // Subscribe to scroll state changes
        this.scrollSubscription = this.virtualScrollService.getScrollState().subscribe(state => {
            this.visibleItems = state.visibleItems;
            this.updateVisibleItems(state);
        });
    }

    /**
     * Update the visible items in the container
     * @param state The current scroll state
     */
    private updateVisibleItems(state: any): void {
        const contentWrapper = this.el.nativeElement.querySelector('#virtual-scroll-content');
        if (!contentWrapper) return;

        // Clear existing items
        while (contentWrapper.firstChild) {
            contentWrapper.removeChild(contentWrapper.firstChild);
        }

        // Create and position visible items
        state.visibleItems.forEach((index: number) => {
            const itemElement = document.createElement('div');
            itemElement.setAttribute('data-index', index.toString());
            itemElement.style.position = 'absolute';
            itemElement.style.top = `${index * this.itemHeight}px`;
            itemElement.style.left = '0';
            itemElement.style.right = '0';
            itemElement.style.height = `${this.itemHeight}px`;

            // Emit the virtual item render event
            this.virtualItemRender.emit({
                index,
                element: itemElement
            });

            contentWrapper.appendChild(itemElement);
        });
    }

    /**
     * Check if an item is currently visible
     * @param index The index of the item to check
     */
    isItemVisible(index: number): boolean {
        return this.visibleItems.includes(index);
    }

    /**
     * Check if an item is centered in the viewport
     * @param index The index of the item to check
     */
    isItemCentered(index: number): boolean {
        return this.virtualScrollService.isItemCentered(index, {
            itemHeight: this.itemHeight,
            containerHeight: this.el.nativeElement.clientHeight,
            bufferSize: this.bufferSize
        });
    }

    /**
     * Scroll to a specific item
     * @param index The index of the item to scroll to
     */
    scrollToItem(index: number): void {
        this.virtualScrollService.scrollToIndex(index, {
            itemHeight: this.itemHeight,
            containerHeight: this.el.nativeElement.clientHeight,
            bufferSize: this.bufferSize
        });
    }
} 