export interface Culture {
  id: string;
  cultureKey: number;
  code: string;
  name: string;
  direction: "ltr" | "rtl";
  isActive: boolean;
  createdAt: string;
  modifiedAt: string | null;
}
