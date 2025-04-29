import { Component } from '@angular/core';
import { PanoramaViewerComponent } from './components/panorama-viewer/panorama-viewer.component';
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-root',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [PanoramaViewerComponent, ScrollingModule],
  template: '<app-panorama-viewer></app-panorama-viewer>',
})
export class AppComponent {
  title = 'test-three-js';
}
