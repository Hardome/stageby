import { useEffect, useState } from 'react';

import { debounce } from '@shared/lib';
import { Input } from '@shared/ui/input';

interface SearchInputProperties {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: Readonly<SearchInputProperties>) {
  const [input, setInput] = useState({ source: value, value });

  if (input.source !== value) setInput({ source: value, value });

  useEffect(() => {
    if (input.value.trim() === value) return;

    const change = debounce(onChange, 300);

    change(input.value.trim());

    return change.cancel;
  }, [input, value, onChange]);

  return (
    <Input
      id="user-search"
      className="min-h-11"
      placeholder="Имя или логин"
      type="search"
      maxLength={100}
      value={input.value}
      onChange={(event) => setInput({ source: value, value: event.target.value })}
    />
  );
}
