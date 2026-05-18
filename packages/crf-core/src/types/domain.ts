/**
 * REDCap domain entity types
 */

/** Project information */
export interface ProjectInfo {
  readonly project_id: number;
  readonly project_title: string;
  readonly creation_time: string;
  readonly production_time?: string;
  readonly in_production: boolean;
  readonly project_language: string;
  readonly purpose: number;
  readonly purpose_other?: string;
  readonly project_notes?: string;
  readonly custom_record_label?: string;
  readonly secondary_unique_field?: string;
  readonly is_longitudinal: boolean;
  readonly has_repeating_instruments_or_events: boolean;
  readonly surveys_enabled: boolean;
  readonly scheduling_enabled: boolean;
  readonly record_autonumbering_enabled: boolean;
  readonly randomization_enabled: boolean;
  readonly project_irb_number?: string;
  readonly project_grant_number?: string;
  readonly project_pi_firstname?: string;
  readonly project_pi_lastname?: string;
  readonly display_today_now_button: boolean;
  readonly missing_data_codes?: string;
  readonly external_modules?: string;
  readonly bypass_branching_erase_field_prompt: number;
}

/** Field/variable metadata */
export interface Field {
  readonly field_name: string;
  readonly form_name: string;
  readonly section_header?: string;
  readonly field_type: FieldType;
  readonly field_label: string;
  readonly select_choices_or_calculations?: string;
  readonly field_note?: string;
  readonly text_validation_type_or_show_slider_number?: string;
  readonly text_validation_min?: string;
  readonly text_validation_max?: string;
  readonly identifier?: string;
  readonly branching_logic?: string;
  readonly required_field?: string;
  readonly custom_alignment?: string;
  readonly question_number?: string;
  readonly matrix_group_name?: string;
  readonly matrix_ranking?: string;
  readonly field_annotation?: string;
}

/** Field types */
export type FieldType =
  | 'text'
  | 'notes'
  | 'calc'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'yesno'
  | 'truefalse'
  | 'file'
  | 'slider'
  | 'descriptive'
  | 'sql';

/** Instrument (form) */
export interface Instrument {
  readonly instrument_name: string;
  readonly instrument_label: string;
}

/** Event */
export interface Event {
  readonly event_name: string;
  readonly arm_num: number;
  readonly unique_event_name: string;
  readonly custom_event_label?: string;
  readonly event_id: number;
  readonly days_offset: number;
  readonly offset_min: number;
  readonly offset_max: number;
}

/** Arm */
export interface Arm {
  readonly arm_num: number;
  readonly name: string;
}

/** User */
export interface User {
  readonly username: string;
  readonly email: string;
  readonly firstname: string;
  readonly lastname: string;
  readonly expiration?: string;
  readonly data_access_group?: string;
  readonly data_access_group_id?: number;
  readonly design: boolean;
  readonly alerts: boolean;
  readonly user_rights: boolean;
  readonly data_access_groups: boolean;
  readonly reports: boolean;
  readonly stats_and_charts: boolean;
  readonly manage_survey_participants: boolean;
  readonly calendar: boolean;
  readonly data_import_tool: boolean;
  readonly data_comparison_tool: boolean;
  readonly logging: boolean;
  readonly file_repository: boolean;
  readonly data_quality_create: boolean;
  readonly data_quality_execute: boolean;
  readonly api_export: boolean;
  readonly api_import: boolean;
  readonly mobile_app: boolean;
  readonly mobile_app_download_data: boolean;
  readonly record_create: boolean;
  readonly record_rename: boolean;
  readonly record_delete: boolean;
  readonly lock_records_all_forms: boolean;
  readonly lock_records: boolean;
  readonly lock_records_customization: boolean;
  readonly forms?: Record<string, FormPermission>;
  readonly forms_export?: Record<string, FormExportPermission>;
}

/** Form permission level */
export type FormPermission = 0 | 1 | 2 | 3;

/** Form export permission level */
export type FormExportPermission = 0 | 1 | 2 | 3;

/** Data Access Group */
export interface DataAccessGroup {
  readonly data_access_group_name: string;
  readonly unique_group_name: string;
  readonly data_access_group_id: number;
}

/** User role */
export interface UserRole {
  readonly unique_role_name: string;
  readonly role_label: string;
  readonly design: boolean;
  readonly alerts: boolean;
  readonly user_rights: boolean;
  readonly data_access_groups: boolean;
  readonly reports: boolean;
  readonly stats_and_charts: boolean;
  readonly manage_survey_participants: boolean;
  readonly calendar: boolean;
  readonly data_import_tool: boolean;
  readonly data_comparison_tool: boolean;
  readonly logging: boolean;
  readonly file_repository: boolean;
  readonly data_quality_create: boolean;
  readonly data_quality_execute: boolean;
  readonly api_export: boolean;
  readonly api_import: boolean;
  readonly mobile_app: boolean;
  readonly mobile_app_download_data: boolean;
  readonly record_create: boolean;
  readonly record_rename: boolean;
  readonly record_delete: boolean;
  readonly lock_records_all_forms: boolean;
  readonly lock_records: boolean;
  readonly lock_records_customization: boolean;
  readonly forms?: Record<string, FormPermission>;
  readonly forms_export?: Record<string, FormExportPermission>;
}

/** Repeating instrument/event configuration */
export interface RepeatingFormsEvents {
  readonly event_name: string;
  readonly form_name?: string;
  readonly custom_form_label?: string;
}

/** Form-event mapping */
export interface FormEventMapping {
  readonly arm_num: number;
  readonly unique_event_name: string;
  readonly form: string;
}

/** Export field name mapping */
export interface ExportFieldName {
  readonly original_field_name: string;
  readonly choice_value?: string;
  readonly export_field_name: string;
}

/** Import result */
export interface ImportResult {
  readonly count: number;
  readonly ids?: readonly string[];
}

/** Log entry */
export interface LogEntry {
  readonly timestamp: string;
  readonly username: string;
  readonly action: string;
  readonly details: string;
  readonly record?: string;
  readonly event?: string;
}
