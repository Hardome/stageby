import { useRef } from 'react';

import { CameraIcon, ImagesIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';

interface PhotoPickerProperties {
  disabled: boolean;
  available: number;
  onSelect: (files: File[]) => void;
}

export function PhotoPicker({ disabled, available, onSelect }: PhotoPickerProperties) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled || available === 0} onClick={() => camera.current?.click()}>
          <CameraIcon data-icon="inline-start" />
          Камера
        </Button>
        <Button variant="outline" disabled={disabled || available === 0} onClick={() => gallery.current?.click()}>
          <ImagesIcon data-icon="inline-start" />
          Из галереи
        </Button>
      </div>
      <input
        ref={camera}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
        capture="environment"
        aria-label="Снять фото"
        onChange={(event) => {
          onSelect([...(event.currentTarget.files ?? [])]);
          event.currentTarget.value = '';
        }}
      />
      <input
        ref={gallery}
        className="hidden"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
        aria-label="Выбрать фотографии"
        onChange={(event) => {
          onSelect([...(event.currentTarget.files ?? [])]);
          event.currentTarget.value = '';
        }}
      />
      <p className="text-muted-foreground text-sm">JPEG, PNG или HEIC до 20 МиБ. Свободно мест: {available} из 20.</p>
    </div>
  );
}
