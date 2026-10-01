import { StackScreenProps } from '@react-navigation/stack';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type ProjectsStackParamList = {
  DashboardList: undefined;
  CreateProject: undefined;
  ProjectDetails: { projectId: string; project?: any };
  ScriptViewer: { projectId: string; project?: any };
  RoleManagement: { projectId: string; project?: any };
  InviteCrew: { projectId: string; project?: any };
  SceneManager: { projectId: string; project?: any };
  ShootDayBoard: { projectId: string; project?: any };
  CallSheetView: { projectId: string; sceneId: string; scene?: any };
  BudgetTracker: { projectId: string; project?: any };
  StoryboardContinuity: { projectId: string; project?: any };
  TeamChat: { projectId: string; project?: any };
  VideoCall: { projectId: string; project?: any };
  ProjectSettings: { projectId: string; project?: any };
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<AuthStackParamList, T>;
export type ProjectsScreenProps<T extends keyof ProjectsStackParamList> = StackScreenProps<ProjectsStackParamList, T>;
