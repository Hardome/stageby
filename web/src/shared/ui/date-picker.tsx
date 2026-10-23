import { type ComponentProps, type Ref, useRef, useState, useSyncExternalStore } from 'react';

import { format, isValid, parse, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { ru } from 'react-day-picker/locale';

import { Button } from './button';
import { Calendar } from './calendar';
import { Input } from './input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './input-group';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from './popover';

// cspell:ignore ГГГГ

interface DatePickerProperties
  extends Pick<
    ComponentProps<'input'>,
    'id' | 'name' | 'disabled' | 'aria-invalid' | 'aria-describedby' | 'aria-labelledby'
  > {
  /**
  ISO date, empty string, or an incomplete manual entry for form validation.
  */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  ref?: Ref<HTMLInputElement | HTMLButtonElement>;
  min?: string;
  max?: string;
  showClearButton?: boolean;
}

function subscribeToPointer(onChange: () => void) {
  const media = window.matchMedia?.('(pointer: coarse)');
  media?.addEventListener('change', onChange);

  return () => media?.removeEventListener('change', onChange);
}

function useIsNativeDatePicker() {
  return useSyncExternalStore(
    subscribeToPointer,
    () => window.matchMedia?.('(pointer: coarse)').matches ?? true,
    () => true,
  );
}

function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
  const date = parseISO(value);

  return isValid(date) && format(date, 'yyyy-MM-dd') === value ? date : undefined;
}

function inputDate(value: string) {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return value;
  const date = parse(value, 'dd.MM.yyyy', new Date(2000, 0, 1));

  return isValid(date) && format(date, 'dd.MM.yyyy') === value ? format(date, 'yyyy-MM-dd') : value;
}

function setControlReference(reference: DatePickerProperties['ref'], element: HTMLInputElement | null) {
  if (typeof reference === 'function') return reference(element);
  if (reference) reference.current = element;
}

export function DatePicker({ showClearButton = true, ...properties }: Readonly<DatePickerProperties>) {
  const isNative = useIsNativeDatePicker();
  if (isNative) {
    const { value, onChange, ref, min, max, onBlur, ...inputProperties } = properties;

    return (
      <Input
        {...inputProperties}
        ref={(element) => setControlReference(ref, element)}
        type="date"
        autoComplete="off"
        className="max-w-full appearance-none"
        value={calendarDate(value) ? value : ''}
        min={min}
        max={max}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return <DesktopDatePicker {...properties} showClearButton={showClearButton} />;
}

function DesktopDatePicker({
  value,
  onChange,
  ref,
  min,
  max,
  onBlur,
  showClearButton,
  ...properties
}: Readonly<DatePickerProperties>) {
  const fieldReference = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [shouldFocusCalendar, setShouldFocusCalendar] = useState(true);
  const selected = calendarDate(value);

  return (
    <Popover open={open && !properties.disabled} onOpenChange={setOpen}>
      <InputGroup ref={fieldReference} className="h-12" data-disabled={properties.disabled}>
        <InputGroupInput
          {...properties}
          ref={(element) => setControlReference(ref, element)}
          type="text"
          autoComplete="off"
          inputMode="numeric"
          placeholder="ДД.ММ.ГГГГ"
          maxLength={10}
          value={selected ? format(selected, 'dd.MM.yyyy') : value}
          onChange={(event) => onChange(inputDate(event.target.value))}
          onClick={() => {
            setShouldFocusCalendar(false);
            setOpen(true);
          }}
          onBlur={onBlur}
        />
        <InputGroupAddon align="inline-end" className="py-0">
          <PopoverTrigger
            render={<InputGroupButton size="icon-sm" />}
            disabled={properties.disabled}
            aria-label="Открыть календарь"
            onClick={() => setShouldFocusCalendar(true)}
          >
            <CalendarIcon data-icon="inline-start" />
          </PopoverTrigger>
        </InputGroupAddon>
      </InputGroup>
      <PopoverContent anchor={fieldReference} align="start" className="w-auto p-0" initialFocus={shouldFocusCalendar}>
        <PopoverTitle className="sr-only">Выбор даты</PopoverTitle>
        <Calendar
          className="[--cell-size:--spacing(10)]"
          mode="single"
          locale={ru}
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected ?? (min ? parseISO(min) : undefined)}
          autoFocus={shouldFocusCalendar}
          disabled={[...(min ? [{ before: parseISO(min) }] : []), ...(max ? [{ after: parseISO(max) }] : [])]}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
        />
        {showClearButton && (
          <Button
            type="button"
            variant="ghost"
            disabled={!value}
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            Очистить дату
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
