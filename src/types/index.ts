export type UserRole = 'admin' | 'project_manager' | 'supervisor' | 'worker';
export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'in_review' | 'completed' | 'cancelled';
export type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type AnnotationType = 'measure' | 'pin' | 'text' | 'reference';
export type PlanStatus = 'Vigente' | 'Revisión' | 'Obsoleto';
export type PlanFileType = 'png' | 'jpg' | 'pdf';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  job_title?: string | null;
  company?: string | null;
  role: UserRole;
  is_online: boolean;
  last_seen?: string | null;
  expo_push_token?: string | null;
  notifications_enabled?: boolean;
  theme_preference?: 'dark' | 'light';
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  progress: number;
  start_date?: string | null;
  end_date?: string | null;
  deadline?: string | null;
  address?: string | null;
  city?: string | null;
  budget?: number | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  creator?: Profile | null;
  members?: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
  profile?: Profile;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string | null;
  created_by?: string | null;
  floor?: string | null;
  zone?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
  project?: Project | null;
  comments?: TaskComment[];
  checklist?: TaskChecklistItem[];
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  author?: Profile;
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  item: string;
  order_index: number;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  project_id: string;
  uploaded_by: string;
  file_url: string;
  file_name: string;
  file_type: PlanFileType;
  mime_type: string;
  code: string;
  title: string;
  discipline: string;
  scale?: string | null;
  scale_real_distance?: number | null;
  scale_pixel_distance?: number | null;
  scale_unit?: string | null;
  level: string;
  revision: string;
  status: PlanStatus;
  plan_group_id?: string | null;
  is_current_revision?: boolean;
  created_at: string;
  updated_at: string;
  uploader?: Profile;
  annotations?: PlanAnnotation[];
}

export interface Document {
  id: string;
  project_id: string;
  uploaded_by: string;
  file_url: string;
  file_name: string;
  file_size?: number | null;
  mime_type: string;
  document_type?: string | null;
  description?: string | null;
  tags?: string[];
  version: number;
  created_at: string;
  uploader?: Profile;
}

export interface PlanAnnotation {
  id: string;
  plan_id: string;
  project_id: string;
  created_by: string;
  type: AnnotationType;
  color: string;
  point_x?: number | null;
  point_y?: number | null;
  label?: string | null;
  start_x?: number | null;
  start_y?: number | null;
  end_x?: number | null;
  end_y?: number | null;
  pixel_dist?: number | null;
  real_dist?: string | null;
  plan_scale?: string | null;
  page_number?: number | null;
  position_x?: number | null;
  position_y?: number | null;
  text?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_thumbnail?: string | null;
  document_id?: string | null;
  created_at: string;
  creator?: Profile;
}

export interface Conversation {
  id: string;
  project_id?: string | null;
  name?: string | null;
  is_group: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  last_message?: Message | null;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at?: string | null;
  joined_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  status: MessageStatus;
  is_edited: boolean;
  created_at: string;
  sender?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export type CreateProjectDTO = Pick<Project,
  'name' | 'description' | 'status' | 'start_date' | 'end_date' |
  'deadline' | 'address' | 'city' | 'budget'
>;

export type UpdateProjectDTO = Partial<CreateProjectDTO> & {
  progress?: number;
};

export type CreateTaskDTO = Pick<Task,
  'project_id' | 'title' | 'description' | 'status' | 'priority' |
  'assigned_to' | 'due_date' | 'floor' | 'zone' | 'estimated_hours'
>;

export interface FilterOptions {
  status?: string;
  priority?: string;
  assigned_to?: string;
  search?: string;
}
