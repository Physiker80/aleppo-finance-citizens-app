import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

// Minimal passthrough to avoid type/runtime issues for now
export default function ErrorBoundary({ children }: Props) {
  return <>{children}</>;
}
