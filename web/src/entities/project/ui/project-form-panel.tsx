import type { ReactNode } from 'react';

import { Badge } from '@shared/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

interface ProjectFormPanelProperties {
  step: number;
  title: string | undefined;
  description: string;
  children: ReactNode;
  actions: ReactNode;
}

export function ProjectFormPanel({ step, title, description, children, actions }: ProjectFormPanelProperties) {
  return (
    <Card className="min-w-0">
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Badge variant="outline">{step} / 3</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
      <CardFooter>{actions}</CardFooter>
    </Card>
  );
}
