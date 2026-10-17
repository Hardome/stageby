import { changed, day, Example, flush, reference, setupTest } from './date-picker-test-setup';

describe('adaptive date picker', () => {
  const context = setupTest();
  const { trigger } = context;

  it('selects a permitted day, closes the calendar and returns focus', async () => {
    await flush(() => context.root.render(<Example />));
    expect(context.container.querySelector('input')).toHaveValue('05.10.2026');
    await flush(() => trigger().click());
    expect(day('02.10.2026')).toBeDisabled();
    expect(day('11.10.2026')).toBeDisabled();
    await flush(() => day('06.10.2026').click());
    expect(changed).toHaveBeenLastCalledWith('2026-10-06');
    expect(context.container.querySelector('input')).toHaveValue('06.10.2026');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(reference.current).toBe(context.container.querySelector('input'));
    expect(trigger()).toHaveFocus();
  });

  it('clears the selected date without submitting a form', async () => {
    await flush(() => context.root.render(<Example />));
    await flush(() => trigger().click());
    const clear = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Очистить дату');
    expect(clear).toHaveAttribute('type', 'button');
    await flush(() => clear?.click());
    expect(changed).toHaveBeenLastCalledWith('');
    expect(context.container.querySelector('input')).toHaveValue('');
  });

  it('keeps the date and constraints when switching to the native control', async () => {
    await flush(() => context.root.render(<Example />));
    await flush(() => {
      context.isCoarse = true;
      context.media.dispatchEvent(new Event('change'));
    });
    const input = context.container.querySelector<HTMLInputElement>('input');
    expect(input).toHaveAttribute('type', 'date');
    expect(input).toHaveValue('2026-10-05');
    expect(input).toHaveAttribute('min', '2026-10-03');
    expect(input).toHaveAttribute('max', '2026-10-10');
    await flush(() => {
      if (!input) throw new Error('Missing native date input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '2026-10-08');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(changed).toHaveBeenLastCalledWith('2026-10-08');
    await flush(() => {
      context.isCoarse = false;
      context.media.dispatchEvent(new Event('change'));
    });
    expect(context.container.querySelector('input')).toHaveValue('08.10.2026');
  });

  it('supports keyboard navigation and closes with Escape', async () => {
    await flush(() => context.root.render(<Example />));
    await flush(() => trigger().click());
    expect(day('05.10.2026')).toHaveFocus();
    await flush(() =>
      day('05.10.2026').dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
        }),
      ),
    );
    expect(day('06.10.2026')).toHaveFocus();
    await flush(() =>
      day('06.10.2026').dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
        }),
      ),
    );
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveFocus();
    expect(changed).not.toHaveBeenCalled();
  });
});
