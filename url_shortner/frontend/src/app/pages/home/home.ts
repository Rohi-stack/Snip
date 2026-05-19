import { Component } from '@angular/core';
import { HeroComponent } from './sections/hero/hero';
import { RecentUrlsComponent } from './sections/recent-urls/recent-urls';
import { FeaturesComponent } from './sections/features/features';
import { FaqComponent } from './sections/faq/faq';

@Component({
  selector: 'app-home',
  imports: [HeroComponent, RecentUrlsComponent, FeaturesComponent, FaqComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
