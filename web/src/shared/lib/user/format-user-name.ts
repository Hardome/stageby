const initial = (value: string) => [...value][0]?.toLocaleUpperCase('ru') ?? '';

export function formatDisplayName(fullName: string, login: string) {
  const parts = (fullName || login).trim().split(/\s+/u).filter(Boolean);
  const [surname = login, firstName, patronymic] = parts;

  return {
    label: [
      surname,
      ...[firstName, patronymic]
        .filter((value): value is string => Boolean(value))
        .map((value) => `${initial(value)}.`),
    ].join(' '),
    initials: firstName ? `${initial(firstName)}${initial(surname)}` : initial(surname),
  };
}
