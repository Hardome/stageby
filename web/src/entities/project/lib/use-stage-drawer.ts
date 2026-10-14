import { useEffect, useRef, useState } from 'react';

export function useStageDrawer(isDisabled: boolean, onStageChange: (index: number) => void) {
  const [isOpen, setIsOpen] = useState(false);
  const pendingStage = useRef<number | undefined>(undefined);
  const hasSelectedStage = useRef(false);
  const listReference = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const media = window.matchMedia('(min-width: 1024px)');
    function closeOnDesktop() {
      if (!media.matches) return;
      pendingStage.current = undefined;
      setIsOpen(false);
    }

    closeOnDesktop();
    media.addEventListener('change', closeOnDesktop);

    return () => media.removeEventListener('change', closeOnDesktop);
  }, [isOpen]);

  function onOpenChange(shouldOpen: boolean) {
    if (shouldOpen) {
      pendingStage.current = undefined;
      hasSelectedStage.current = false;
    }

    setIsOpen(shouldOpen && !isDisabled);
  }

  function onOpenChangeComplete(hasOpened: boolean) {
    if (hasOpened) {
      listReference.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest' });
    } else {
      const index = pendingStage.current;
      pendingStage.current = undefined;
      if (index !== undefined && !isDisabled) onStageChange(index);
      setIsOpen(false);
    }
  }

  function selectStage(index: number) {
    pendingStage.current = index;
    hasSelectedStage.current = true;
    setIsOpen(false);
  }

  return {
    isOpen: isOpen && !isDisabled,
    listReference,
    onOpenChange,
    onOpenChangeComplete,
    selectStage,
    finalFocus: () => !hasSelectedStage.current,
  };
}
