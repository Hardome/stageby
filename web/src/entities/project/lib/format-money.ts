export function formatMoney(value: bigint | null): string {
  return value === null ? 'Не задан' : `${new Intl.NumberFormat('ru-RU').format(value / 100n)} ₽`;
}
