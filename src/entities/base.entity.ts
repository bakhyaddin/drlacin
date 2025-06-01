export class BaseEntity<Entity> {
  id!: number;
  createdAt!: Date;

  constructor(entity: Partial<Entity>) {
    Object.assign(this, entity);
  }
}
