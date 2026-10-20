import { type ComponentProps, useLayoutEffect, useRef } from 'react';

import { Input } from './input';

interface MoneyInputProperties
  extends Omit<ComponentProps<typeof Input>, 'value' | 'defaultValue' | 'onChange' | 'type'> {
  value: string;
  onValueChange: (value: string) => void;
}

function formatAmount(value: string) {
  const digits = value.replaceAll(/\s/g, '');
  return /^\d*$/.test(digits)
    ? Array.from(digits, (digit, index) => (index > 0 && (digits.length - index) % 3 === 0 ? ` ${digit}` : digit)).join(
        '',
      )
    : value;
}

function selectionPosition(value: string, position: number, formatted: string) {
  const digitsBefore = value.slice(0, position).replaceAll(/\D/g, '').length;
  if (digitsBefore === 0) return 0;
  let digits = 0;
  for (const [index, character] of [...formatted].entries()) {
    if (character !== ' ') digits += 1;
    if (digits === digitsBefore) return index + 1;
  }

  return formatted.length;
}

function separatorDeletion(input: HTMLInputElement, key: string) {
  const start = input.selectionStart;
  if (start === null || start !== input.selectionEnd || !/^[\d ]*$/.test(input.value)) return;
  const isBackwards = key === 'Backspace';
  if (!isBackwards && key !== 'Delete') return;
  const separator = isBackwards ? start - 1 : start;
  if (input.value[separator] !== ' ') return;
  const digit = isBackwards ? separator - 1 : separator + 1;

  return {
    value: input.value.slice(0, digit) + input.value.slice(digit + 1),
    caret: isBackwards ? digit : start,
  };
}

function MoneyInput({ value, onValueChange, onKeyDown, inputMode = 'numeric', ...properties }: MoneyInputProperties) {
  const selection = useRef<{ input: HTMLInputElement; start: number; end: number } | null>(null);

  useLayoutEffect(() => {
    if (!selection.current) return;
    const { input, start, end } = selection.current;
    input.setSelectionRange(start, end);
    selection.current = null;
  });

  function update(input: HTMLInputElement, nextValue: string, start: number, end: number) {
    if (!/^[\d\s]*$/.test(nextValue)) {
      input.value = formatAmount(value);

      return;
    }

    const formatted = formatAmount(nextValue);
    const nextStart = selectionPosition(nextValue, start, formatted);
    const nextEnd = selectionPosition(nextValue, end, formatted);
    selection.current = { input, start: nextStart, end: nextEnd };
    input.value = formatted;
    onValueChange(formatted);
    input.setSelectionRange(nextStart, nextEnd);
  }

  return (
    <Input
      {...properties}
      type="text"
      inputMode={inputMode}
      value={formatAmount(value)}
      onChange={(event) => {
        const input = event.currentTarget;
        update(
          input,
          input.value,
          input.selectionStart ?? input.value.length,
          input.selectionEnd ?? input.value.length,
        );
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          event.defaultPrevented ||
          event.currentTarget.readOnly ||
          event.nativeEvent.isComposing ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        )
          return;
        const deletion = separatorDeletion(event.currentTarget, event.key);
        if (!deletion) return;
        event.preventDefault();
        update(event.currentTarget, deletion.value, deletion.caret, deletion.caret);
      }}
    />
  );
}

export { MoneyInput };
