import type { FileRejection } from 'react-dropzone';

export function fileRejectionMessage(
  { file, errors }: FileRejection,
  validateFile?: (file: File) => string | undefined,
) {
  const validation = validateFile?.(file);
  const messages = errors.map((error) => {
    switch (error.code) {
      case 'file-invalid-type': {
        return 'Недопустимый тип файла.';
      }
      case 'file-too-large': {
        return 'Файл превышает допустимый размер.';
      }
      case 'too-many-files': {
        return 'Выберите один файл.';
      }
      default: {
        return error.message;
      }
    }
  });

  return `${file.name}: ${validation ?? messages.join(' ')}`;
}
