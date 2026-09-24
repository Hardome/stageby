import { TodoList } from '@features/todo-list';

export function HomePage() {
  return (
    <main className="min-h-dvh bg-linear-to-br from-emerald-50 via-stone-100 to-amber-50 px-3 py-6 text-stone-900 sm:px-5 sm:py-16">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-emerald-950/10 bg-white/90 p-5 shadow-2xl shadow-emerald-950/10 backdrop-blur-sm sm:p-10">
        <header className="mb-8">
          <p className="mb-2 font-extrabold text-emerald-800 text-xs uppercase tracking-[0.16em]">Stageby</p>
          <h1 className="m-0 font-bold text-4xl tracking-[-0.055em] sm:text-6xl">Мои задачи</h1>
          <p className="mt-3.5 mb-0 text-stone-500">Простой список дел на сегодня</p>
        </header>
        <TodoList />
      </div>
    </main>
  );
}
