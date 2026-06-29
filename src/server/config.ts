export interface Root {
  label: string;
  path: string;
}

export type ItemType = "skill" | "command";

export interface AppConfig {
  port: number;
  roots: Root[];
}
