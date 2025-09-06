import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

// Simple passthrough boundary to avoid type issues; can be enhanced later
export default function ErrorBoundary({ children }: Props) {
  return <>{children}</>;
}
