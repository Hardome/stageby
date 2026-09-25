import { TodoList } from '@features/todo-list';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

export function HomePage() {
  return (
    <main className="min-h-dvh bg-muted/40 px-3 py-8 sm:px-5 sm:py-16">
      <Card className="mx-auto w-full max-w-2xl shadow-sm">
        <CardHeader>
          <CardTitle>
            <h1>Мои задачи</h1>
          </CardTitle>
          <CardDescription>Простой список дел на сегодня</CardDescription>
        </CardHeader>
        <CardContent>
          <TodoList />
        </CardContent>
        <CardFooter className="text-muted-foreground text-xs">Stageby</CardFooter>
      </Card>
    </main>
  );
}
