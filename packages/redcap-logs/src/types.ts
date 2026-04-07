export type LogUserType = "loggé" | "lien_personnel" | "anonyme";

export type LogActionCategory =
  | "Données"
  | "Survey"
  | "API"
  | "Projet"
  | "Utilisateurs"
  | "Authentification"
  | "Autre";

export interface RedcapLogEntry {
  readonly project_id: number;
  readonly timestamp: Date;
  readonly username: string;
  readonly action: string;
  readonly user_type: LogUserType;
  readonly action_category: LogActionCategory;
}

export interface RollingPoint {
  readonly date: Date;
  readonly users_total: number;
  readonly users_logged: number;
  readonly users_link: number;
  readonly users_anon: number;
  readonly projects_active: number;
  readonly actions_total: number;
  readonly actions_data: number;
  readonly actions_survey: number;
  readonly actions_api: number;
  readonly actions_project: number;
  readonly actions_users: number;
  readonly actions_auth: number;
  readonly actions_other: number;
}

export interface ProjectToken {
  readonly project_id: number;
  readonly token: string;
}
