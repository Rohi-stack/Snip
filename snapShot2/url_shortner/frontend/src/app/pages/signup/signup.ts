import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  private authService = inject(AuthService);
  private router = inject(Router);

  onSubmit(event: Event) {
    event.preventDefault();
    this.authService.login();
    this.router.navigate(['/dashboard/links']);
  }
}
