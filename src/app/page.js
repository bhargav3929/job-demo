'use client';

import { Suspense } from 'react';
import AIChatCard from '@/components/ui/ai-chat';
import GenerativeMountainScene from '@/components/ui/mountain-scene';

export default function Home() {
  return (
    <main className="page-wrapper">
      {/* Mountain Scene Background */}
      <Suspense fallback={<div className="mountain-fallback" />}>
        <GenerativeMountainScene />
      </Suspense>

      {/* AI Chat Card container - absolute overlay to prevent layout shifts */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
          pointerEvents: 'none'
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <AIChatCard />
        </div>
      </div>
    </main>
  );
}
