import { Component, signal } from '@angular/core';
import type { FaqItem } from '../../../../models/feature.model';

@Component({
  selector: 'app-faq',
  imports: [],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
})
export class FaqComponent {
  activeIndex = signal<number | null>(null);

  faqs: FaqItem[] = [
    {
      question: 'Is Snip free to use?',
      answer: 'Yes! Our free tier includes up to 50 short links per month, basic click analytics, and standard short URLs. Upgrade to Pro for unlimited links, custom aliases, advanced analytics, QR code generation, and link expiry controls.',
    },
    {
      question: 'What happens when a link expires?',
      answer: 'When a link reaches its expiry date, visitors are redirected to a friendly expiry notice page. You can renew or update the link at any time from your dashboard — even after expiry.',
    },
    {
      question: 'Can I use custom aliases?',
      answer: 'Custom aliases (e.g. snip.ly/my-campaign) are available on Pro and above. Free tier links receive a randomly generated code. Aliases must be unique and between 3–32 characters.',
    },
    {
      question: 'Do you support QR code downloads?',
      answer: 'Yes. Pro users can generate and download QR codes in PNG and SVG formats. All QR codes include subtle orange branding and rounded corners — styled, not generic.',
    },
    {
      question: 'Can I use my own domain?',
      answer: 'Custom domain support (e.g. links.yourbrand.com) is on our roadmap and will be available in an upcoming Enterprise tier. Sign up for updates to be notified when it launches.',
    },
    {
      question: 'Who is this platform for?',
      answer: 'Snip is built for marketers, developers, content creators, and SaaS teams who need reliable link management, real-time analytics, and clean branded URLs — without a complex enterprise setup.',
    },
    {
      question: 'What analytics are provided?',
      answer: 'Every link tracks total clicks, unique visitors, referrers, geographic location (country/city), device type, browser, and OS. Pro users get 90-day history; free tier gets 7 days.',
    },
  ];

  toggle(index: number): void {
    this.activeIndex.update(current => (current === index ? null : index));
  }
}
