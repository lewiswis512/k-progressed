import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { User } from '../schemas/user.schema';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { escapeRegex } from '../../../utils/string/escape-regex';

export const PUBLIC_USER_FIELDS =
  'usr_username usr_firstname usr_lastname usr_photo usr_slug';

@Injectable()
export class UserRepository extends AbstractRepository<User> {
  protected readonly logger: Logger = new Logger(UserRepository.name);

  constructor(@InjectModel(User.name) private userModel: Model<User>) {
    super(userModel);
  }

  emailFilter(email: string): FilterQuery<User> {
    return {
      usr_email: new RegExp(`^${escapeRegex(email.trim())}$`, 'i'),
    };
  }

  async findOneWithPassword(
    filterQuery: FilterQuery<User>,
  ): Promise<User | null> {
    return this.userModel.findOne(filterQuery).select('+usr_password');
  }

  async findByIdWithPassword(id: Types.ObjectId): Promise<User | null> {
    return this.userModel.findById(id).select('+usr_password');
  }

  async paginate(
    filterQuery: FilterQuery<User>,
    page: number,
    limit: number,
  ): Promise<{ data: User[]; total: number }> {
    const [data, total] = await Promise.all([
      this.userModel
        .find(filterQuery)
        .select('-stripe_customer_id')
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<User[]>(),
      this.userModel.countDocuments(filterQuery),
    ]);

    return { data, total };
  }

  async findSessionUser(id: Types.ObjectId): Promise<User | null> {
    return this.userModel
      .findById(id)
      .select(
        'usr_username usr_email usr_firstname usr_lastname usr_slug usr_photo usr_type usr_role stripe_customer_id usr_token_version',
      )
      .lean<User>();
  }

  isDatabaseUp(): boolean {
    return this.userModel.db.readyState === 1;
  }

  async findPublicById(id: Types.ObjectId): Promise<User> {
    return this.findById(id, { select: PUBLIC_USER_FIELDS });
  }
}
