import { StackScreenProps } from '@react-navigation/stack';

export type Project = {
  id: string;
  tenant_id: string;
  name: string;
  status: 'pre-production' | 'production' | 'post-production' | 'archived';
  script_version: number;
  created_at: string;
  updated_at?: string;
};

export type Scene = {
  id: string;
  project_id: string;
  scene_number: string;
  location: string;
  day_night: string;
  description: string;
  scheduled_date: string | null;
  status: string;
  characters: string[];
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type ProjectsStackParamList = {
  DashboardList: undefined;
  CreateProject: undefined;
  ProjectDetails: { projectId: string; project?: Project };
  ScriptViewer: { projectId: string; project?: Project };
  RoleManagement: { projectId: string; project?: Project };
  InviteCrew: { projectId: string; project?: Project };
  SceneManager: { projectId: string; project?: Project };
  CallSheetView: { projectId: string; sceneId: string; scene: Scene };
  BudgetTracker: { projectId: string; project?: Project };
  StoryboardContinuity: { projectId: string; project?: Project };
  TeamChat: { projectId: string; project?: Project };
  VideoCall: { projectId: string; project?: Project };
  ProjectSettings: { projectId: string; project: Project };
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<AuthStackParamList, T>;
export type ProjectsScreenProps<T extends keyof ProjectsStackParamList> = StackScreenProps<ProjectsStackParamList, T>;
