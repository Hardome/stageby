import { cn } from 'cn';
import { ArrowRightIcon, CheckCheckIcon, ClipboardCheckIcon, RotateCcwIcon } from 'lucide-react';

import type { Checklist } from '@api/types';

interface ChecklistProgressProperties {
  checklist: Checklist;
}

export function ChecklistProgress({ checklist }: ChecklistProgressProperties) {
  const completed = checklist.items.filter((item) => item.isCompleted).length;
  const returned = checklist.items.filter((item) => item.requiresRework).length;
  const total = checklist.items.length;
  const summary = [
    { label: 'Выполнено', value: completed, icon: CheckCheckIcon },
    { label: 'Осталось', value: total - completed, icon: ArrowRightIcon },
    { label: 'На доработке', value: returned, icon: RotateCcwIcon },
  ];

  return (
    <section
      className="overflow-hidden rounded-2xl bg-surface-inverse text-surface-inverse-foreground"
      aria-label="Готовность чек-листа"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 sm:p-4">
        <div className="flex flex-col items-start gap-2">
          <span
            className={cn(
              'flex items-center gap-2 font-semibold text-surface-inverse-muted text-xs',
              'uppercase tracking-widest',
            )}
          >
            <ClipboardCheckIcon className="size-4" aria-hidden="true" /> Готовность работ
          </span>
          <div>
            <label
              htmlFor={`checklist-progress-${checklist.stageId}`}
              className="block text-sm text-surface-inverse-muted"
            >
              Выполнено {completed} из {total}
              {' · '}
              {checklist.progressPercent}%
            </label>
          </div>
        </div>
        <div className="flex items-baseline gap-1 font-bold tabular-nums tracking-tighter sm:self-end">
          <span className="text-4xl sm:text-5xl">{checklist.progressPercent}</span>
          <span className="text-2xl text-surface-inverse-muted">%</span>
        </div>
        <progress
          id={`checklist-progress-${checklist.stageId}`}
          max={100}
          value={checklist.progressPercent}
          className={cn(
            'col-span-2 h-2 w-full appearance-none overflow-hidden rounded-full border-0',
            'bg-surface-inverse-accent [&::-webkit-progress-bar]:bg-surface-inverse-accent',
            '[&::-moz-progress-bar]:bg-primary [&::-webkit-progress-value]:bg-primary',
          )}
        />
      </div>
      <dl className="grid grid-cols-3 border-surface-inverse-border border-t bg-surface-inverse-accent">
        {summary.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className={cn(
              'flex min-w-0 flex-col gap-1 border-surface-inverse-border border-r px-2 py-2',
              'last:border-0 sm:px-4',
            )}
          >
            <dt className={cn('flex items-center gap-1.5 text-surface-inverse-muted text-xs')}>
              <Icon className="hidden size-3.5 sm:block" aria-hidden="true" />
              {label}
            </dt>
            <dd className="font-bold text-xl tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
