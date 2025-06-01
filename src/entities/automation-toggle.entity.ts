import { BaseEntity } from "./base.entity";

export class AutomationToggle extends BaseEntity<AutomationToggle> {
  isEnabled!: boolean;
}
