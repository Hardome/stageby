export function formatDecisionDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Yekaterinburg',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
