import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { RefreshToken } from '../schemas/refresh-token.schema';

@Injectable()
export class RefreshTokenRepository extends AbstractRepository<RefreshToken> {
  protected readonly logger: Logger = new Logger(RefreshTokenRepository.name);

  constructor(
    @InjectModel(RefreshToken.name) refreshTokenModel: Model<RefreshToken>,
  ) {
    super(refreshTokenModel);
  }
}
