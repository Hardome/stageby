export interface ProjectNavigationStage {
  index: number;
  title: string;
  hasError: boolean;
}

export interface ProjectStageNavigationProperties {
  stages: ProjectNavigationStage[];
  currentStage: number | undefined;
  disabled: boolean;
  onStageChange: (index: number) => void;
}
