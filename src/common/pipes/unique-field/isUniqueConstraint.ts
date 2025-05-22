import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { MongooseRepository } from 'src/common/repository/mongo.repository';
import { IsUniqueConstraintInput } from './IsUnique';

@ValidatorConstraint({ name: 'is-already-exist-constraint', async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private readonly mongooseRepository: MongooseRepository) {}

  async validate(
    value: string,
    validationArguments?: ValidationArguments,
  ): Promise<boolean> {
    const { collectionProperty, collectionName }: IsUniqueConstraintInput =
      validationArguments.constraints[0];

    return await this.mongooseRepository.exists(
      collectionName,
      collectionProperty,
      value,
    );
  }

  defaultMessage?(validationArguments?: ValidationArguments): string {
    const field: string = validationArguments.property;

    return `${field} is already exist`;
  }
}
