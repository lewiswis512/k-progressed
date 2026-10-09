import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { Certificate } from '../certificate.schema';

export class CertificateRepository extends AbstractRepository<Certificate> {
  protected logger: Logger = new Logger();

  constructor(
    @InjectModel(Certificate.name) private certificateModel: Model<Certificate>,
  ) {
    super(certificateModel);
  }
}
