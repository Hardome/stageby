// cspell:ignore ГГГГ
import { DatePicker } from './date-picker';
import { changed, day, Example, flush, setupTest } from './date-picker-test-setup';

describe('adaptive date picker', () => {
  const context = setupTest();
  const { trigger, typeDate } = context;

  it('converts manual input and selects the same day in the calendar', async () => {
    await flush(() => context.root.render(<Example />));
    await typeDate('08.10.2026');
    expect(changed).toHaveBeenLastCalledWith('2026-10-08');
    expect(context.container.querySelector('input')).toHaveValue('08.10.2026');
    await flush(() => trigger().click());
    expect(day('08.10.2026')).toHaveAttribute('data-selected-single', 'true');
    await flush(() => day('09.10.2026').click());
    expect(context.container.querySelector('input')).toHaveValue('09.10.2026');
  });

  it('opens the calendar on input clicks while allowing typing without losing focus', async () => {
    await flush(() => context.root.render(<Example />));
    const input = context.container.querySelector('input');
    if (!input) throw new Error('Missing date input');
    await flush(() => {
      input.focus();
      input.click();
    });
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveFocus();
    await typeDate('08.10.2026');
    expect(changed).toHaveBeenLastCalledWith('2026-10-08');
    expect(day('08.10.2026')).toHaveAttribute('data-selected-single', 'true');
    expect(input).toHaveFocus();
    await flush(() => day('09.10.2026').click());
    expect(input).toHaveValue('09.10.2026');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    await flush(() => {
      input.focus();
      input.click();
    });
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveFocus();
  });

  it('retains incomplete and impossible dates for form validation', async () => {
    await flush(() => context.root.render(<Example />));
    await typeDate('31.02.');
    expect(context.container.querySelector('input')).toHaveValue('31.02.');
    expect(changed).toHaveBeenLastCalledWith('31.02.');
    await typeDate('31.02.2026');
    await flush(() => {
      context.container.querySelector('input')?.focus();
      context.container.querySelector('input')?.blur();
    });
    expect(context.container.querySelector('input')).not.toHaveAttribute('aria-invalid', 'true');
    expect(context.container.textContent).not.toContain('Введите дату в формате ДД.ММ.ГГГГ.');
    expect(changed).toHaveBeenLastCalledWith('31.02.2026');
    await typeDate('09.10.2026');
    expect(context.container.querySelector('input')).not.toHaveAttribute('aria-invalid', 'true');
    await typeDate('');
    expect(changed).toHaveBeenLastCalledWith('');
  });

  it('converts valid leap days and passes manual dates outside calendar bounds to the form', async () => {
    await flush(() => context.root.render(<Example />));
    await typeDate('29.02.2024');
    expect(changed).toHaveBeenLastCalledWith('2024-02-29');
    await typeDate('29.02.2025');
    expect(changed).toHaveBeenLastCalledWith('29.02.2025');
    await typeDate('11.10.2026');
    await flush(() => {
      context.container.querySelector('input')?.focus();
      context.container.querySelector('input')?.blur();
    });
    expect(changed).toHaveBeenLastCalledWith('2026-10-11');
    expect(context.container.querySelector('input')).toHaveValue('11.10.2026');
    expect(context.container.textContent).not.toContain('Дата находится вне допустимого диапазона.');
    await typeDate('10.10.2026');
    expect(context.container.querySelector('input')).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('forwards the form error attributes and blur handler without adding an error message', async () => {
    const onBlur = vi.fn();
    await flush(() =>
      context.root.render(
        <DatePicker value="31.02.2026" onChange={changed} onBlur={onBlur} aria-invalid aria-describedby="date-error" />,
      ),
    );
    const input = context.container.querySelector('input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'date-error');
    await flush(() => {
      input?.focus();
      input?.blur();
    });
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(context.container.textContent).not.toContain('Введите дату');
  });

  it('disables both controls', async () => {
    await flush(() => context.root.render(<Example disabled />));
    expect(trigger()).toBeDisabled();
    await flush(() => {
      context.isCoarse = true;
      context.media.dispatchEvent(new Event('change'));
    });
    expect(context.container.querySelector('input')).toBeDisabled();
  });
});
