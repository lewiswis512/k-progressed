import { Injectable, NotFoundException } from '@nestjs/common';
import { IRepository } from '../interfaces/IRepository';
import { UserRepository } from '../../modules/users/repository/user.repository';
import { escapeRegex } from '../../utils/string/escape-regex';

@Injectable()
export class MongoRepository implements IRepository {
  constructor(private readonly userRepository: UserRepository) {}

  private repositoryOf(collectionName: string): UserRepository {
    if (collectionName === 'users') {
      return this.userRepository;
    }

    throw new NotFoundException('Class model not found');
  }

  async exists(
    collectionName: string,
    field: string,
    value: string,
  ): Promise<boolean> {
    const result = await this.repositoryOf(collectionName).findOneOrNull({
      [field]: new RegExp(`^${escapeRegex(String(value))}$`, 'i'),
    });

    return result ? true : false;
  }
}
