const formatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Asia/Yekaterinburg',
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDateTime(value: string) {
  return formatter.format(new Date(value));
}
