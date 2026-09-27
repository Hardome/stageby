import type { Ref } from 'react';

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';

import { roleItems } from '../../model/data';

interface RoleSelectProperties {
  value: string | null;
  onChange: (value: string | null) => void;
  id: string;
  items?: { value: string; label: string }[];
  disabled?: boolean;
  invalid?: boolean;
  onBlur?: () => void;
  inputRef?: Ref<HTMLButtonElement>;
}

export function RoleSelect({
  value,
  onChange,
  id,
  items = roleItems,
  disabled,
  invalid,
  onBlur,
  inputRef,
}: RoleSelectProperties) {
  return (
    <Select items={items} value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        className="min-h-11 w-full"
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onBlur={onBlur}
        ref={inputRef}
      >
        <SelectValue placeholder="Выберите роль" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} className="min-h-11">
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
