import { act } from 'react';

export async function revealProjectChecklist(element: HTMLElement) {
  const item = element.closest('[data-slot="accordion-item"]');
  const trigger = item?.querySelector<HTMLButtonElement>('[data-slot="accordion-trigger"]');
  if (trigger?.getAttribute('aria-expanded') !== 'false') return;

  await act(async () => {
    trigger.click();
    await Promise.resolve();
  });
}
