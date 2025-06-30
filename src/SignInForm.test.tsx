import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignInForm } from './SignInForm';

// Mock the Clerk SignIn component
vi.mock('@clerk/clerk-react', () => ({
  SignIn: () => <div data-testid="mock-sign-in">Mock Sign In Component</div>,
}));

describe('SignInForm', () => {
  it('renders the sign in form', () => {
    render(<SignInForm />);
    expect(screen.getByTestId('mock-sign-in')).toBeInTheDocument();
  });

  it('has the correct container class', () => {
    render(<SignInForm />);
    const container = screen.getByTestId('mock-sign-in').parentElement;
    expect(container).toHaveClass('w-full');
  });
}); 