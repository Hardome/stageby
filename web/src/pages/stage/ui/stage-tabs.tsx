import { type ReactNode, useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';

import { type StageTab, stageTabs } from '../lib/stage-search';

interface StageTabsProperties {
  tab: StageTab;
  onTabChange: (tab: StageTab) => void;
  checklist: ReactNode;
  materials: ReactNode;
  work: ReactNode;
}

const labels = { checklist: 'Чек-лист', materials: 'Материалы', work: 'Оплата работ' };

export function StageTabs({ tab, onTabChange, ...panels }: Readonly<StageTabsProperties>) {
  const [visited, setVisited] = useState(() => new Set<StageTab>([tab]));
  if (!visited.has(tab)) setVisited(new Set([...visited, tab]));

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const next = stageTabs.find((entry) => entry === value);
        if (next) onTabChange(next);
      }}
    >
      <TabsList aria-label="Разделы этапа">
        {stageTabs.map((value) => (
          <TabsTrigger key={value} value={value}>
            {labels[value]}
          </TabsTrigger>
        ))}
      </TabsList>
      {stageTabs.map((value) => (
        <TabsContent key={value} value={value} keepMounted>
          {visited.has(value) && <div className="flex min-w-0 flex-col gap-4">{panels[value]}</div>}
        </TabsContent>
      ))}
    </Tabs>
  );
}
