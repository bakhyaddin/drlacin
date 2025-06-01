import { BaseEntity } from "./base.entity";

export class SessionCookie extends BaseEntity<SessionCookie> {
  cookies!: string;
}
