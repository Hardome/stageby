import type { ApiError } from '@api/types';

export function photoFailure(error: unknown) {
  return error as { status?: number; data?: ApiError } | undefined;
}

export function photoFailureMessage(error: unknown) {
  const failure = photoFailure(error);

  if (failure?.status === 401) return 'Войдите снова, чтобы продолжить загрузку.';
  if (failure?.status === 403 || failure?.status === 404) return 'Фотографии больше недоступны для изменения.';
  if (failure?.data?.code === 'version_conflict') return 'Данные изменились. Обновите их и повторите действие.';
  if (failure?.status === 409) return failure.data?.message ?? 'Состояние пункта изменилось. Обновите данные.';
  return error instanceof Error ? error.message : 'Не удалось сохранить фото. Повторите попытку.';
}
