import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

export function HomePage() {
  return (
    <main className="flex-1 bg-background px-3 py-8 sm:px-5 sm:py-16">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>
            <h1 className="font-bold text-2xl">Stageby</h1>
          </CardTitle>
          <CardDescription>Управление строительством</CardDescription>
        </CardHeader>
        <CardFooter className="text-muted-foreground text-xs">Stageby</CardFooter>
      </Card>
    </main>
  );
}
