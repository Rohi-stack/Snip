import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './billing.html',
  styleUrl: './billing.scss',
})
export class Billing {}
