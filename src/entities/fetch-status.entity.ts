import { BaseEntity } from "./base.entity";

export class FetchStatus extends BaseEntity<FetchStatus> {
  lastFetch!: Date;
  status!: string;
  message!: string;
  patientCount!: number;
}
