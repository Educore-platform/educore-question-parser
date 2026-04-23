import { EntityManager, EntityTarget, QueryRunner, Repository } from 'typeorm';
import { BaseEntity } from '../entities/base.entity';

export abstract class BaseRepository<
  T extends BaseEntity,
> extends Repository<T> {
  protected constructor(
    entity: EntityTarget<T>,
    manager: EntityManager,
    queryRunner?: QueryRunner,
  ) {
    super(entity, manager, queryRunner);
  }
}
