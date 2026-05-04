import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

describe("ErrorBoundary", () => {
  const ThrowError = () => {
    throw new Error("Test error");
  };

  const ValidComponent = () => <div>Valid content</div>;

  it("should render children when there is no error", () => {
    render(
      <ErrorBoundary>
        <ValidComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Valid content")).toBeInTheDocument();
  });

  it("should catch errors and display fallback UI", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/refresh the page/i)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("should display custom fallback when provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom error message")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});

import { vi } from "vitest";
