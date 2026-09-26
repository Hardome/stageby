export function debounce<Arguments extends unknown[]>(callback: (...arguments_: Arguments) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;

  const run = (...arguments_: Arguments) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...arguments_), delay);
  };

  run.cancel = () => clearTimeout(timer);

  return run;
}
