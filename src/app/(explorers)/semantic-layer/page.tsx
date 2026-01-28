import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SemanticLayerView from '@/components/bigquery-explorer/semantic-layer-view';

export default function SemanticLayerPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 h-full">
      <Suspense fallback={
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <SemanticLayerView />
      </Suspense>
    </main>
  );
}
