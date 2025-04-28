import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { VirtualScrollService, VirtualScrollOptions } from '../../services/virtual-scroll.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-virtual-scroll',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="virtual-scroll-container" #scrollContainer>
      <div class="virtual-scroll-content" [style.height.px]="totalHeight">
        <div class="virtual-scroll-items" [style.transform]="'translateY(' + offset + 'px)'">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .virtual-scroll-container {
      height: 100%;
      overflow-y: auto;
      position: relative;
    }
    .virtual-scroll-content {
      position: relative;
    }
    .virtual-scroll-items {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    }
  `]
})
export class VirtualScrollComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('scrollContainer') scrollContainer!: ElementRef;
    @Input() itemHeight = 50;
    @Input() bufferSize = 5;
    @Input() totalItems = 0;
    @Output() visibleItemsChange = new EventEmitter<number[]>();

    private subscription = new Subscription();
    totalHeight = 0;
    offset = 0;
    visibleItems: number[] = [];

    constructor(
        @Inject(PLATFORM_ID) private platformId: Object,
        private virtualScrollService: VirtualScrollService
    ) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.totalHeight = this.totalItems * this.itemHeight;
        }
    }

    ngAfterViewInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.initializeVirtualScroll();
        }
    }

    private initializeVirtualScroll() {
        const options: VirtualScrollOptions = {
            itemHeight: this.itemHeight,
            containerHeight: this.scrollContainer.nativeElement.clientHeight,
            bufferSize: this.bufferSize
        };

        this.virtualScrollService.initialize(
            this.scrollContainer.nativeElement,
            this.totalItems,
            options
        );

        this.subscription.add(
            this.virtualScrollService.getScrollState().subscribe(state => {
                this.offset = state.startIndex * this.itemHeight;
                this.visibleItems = state.visibleItems;
                this.visibleItemsChange.emit(this.visibleItems);
            })
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
        this.virtualScrollService.destroy();
    }
} 