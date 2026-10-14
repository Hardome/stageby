import { StageOverview } from '@features/stages/view';

export function StagePage({ stageId }: { stageId: string }) {
  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-8 sm:px-5 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <StageOverview stageId={stageId} />
      </div>
    </main>
  );
}
