import { Component, signal } from '@angular/core';
import { ColorExtractorComponent } from './color-extractor.component';

@Component({
  imports: [ColorExtractorComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('logo-color-extractor');
}