import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { MongoRepository } from '../../../common/repository/mongo.repository';
import { IsUniqueConstraintInput } from './IsUnique';

@ValidatorConstraint({ name: 'is-already-exist-constraint', async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private readonly MongoRepository: MongoRepository) {}

  async validate(
    value: string,
    validationArguments?: ValidationArguments,
  ): Promise<boolean> {
    const { collectionProperty, collectionName }: IsUniqueConstraintInput =
      validationArguments.constraints[0];

    const isChecked = await this.MongoRepository.exists(
      collectionName,
      collectionProperty,
      value,
    );

    return !isChecked;
  }

  defaultMessage?(validationArguments?: ValidationArguments): string {
    const field: string = validationArguments.property;

    return `${field} is already exist`;
  }
}
