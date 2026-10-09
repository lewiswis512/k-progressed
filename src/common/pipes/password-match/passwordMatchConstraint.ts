import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'passwordMatch', async: false })
export class PasswordMatchConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, validationArguments?: ValidationArguments): boolean {
    const { password } = validationArguments.object as { password?: unknown };

    return value === password;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;

    return `${args.property} and ${relatedPropertyName} do not match`;
  }
}
