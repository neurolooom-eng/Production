export interface Field {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'boolean'
      | 'select' | 'multiselect' | 'ref' | 'signature' | 'password' | 'json';
  required?: boolean;
  options?: string[];
  ref?: string;
  refField?: string;
  default?: unknown;
  computed?: string;
  wrap?: boolean;
  width?: number;
  hideInTable?: boolean;
  writeOnly?: boolean;
  section?: string;
}

export interface ResourceMeta {
  key: string;
  singular: string;
  plural: string;
  group: string;
  icon: string;
  isoClause: string;
  titleField: string;
  readOnly: boolean;
  permissions: { read: string[] | null; write: string[] | null };
  canRead: boolean;
  canWrite: boolean;
  fields: Field[];
}

export interface User {
  id: string; username: string; full_name?: string; name?: string; email?: string; role: string; department?: string;
}

export type Row = Record<string, any>;
