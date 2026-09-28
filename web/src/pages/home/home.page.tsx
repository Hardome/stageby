import { TodoList } from '@features/todo-list';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

export function HomePage() {
  return (
    <main className="flex-1 bg-background px-3 py-8 sm:px-5 sm:py-16">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>
            <h1 className="font-bold text-2xl">Мои задачи</h1>
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
