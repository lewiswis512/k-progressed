import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class BillingAddressDto {
  @ApiProperty({ example: '12 rue de la Paix' })
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MaxLength(200)
  line1: string;

  @ApiProperty({ example: 'Paris' })
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: '75002' })
  @IsString()
  @IsNotEmpty({ message: 'Postal code is required' })
  @MaxLength(20)
  postal_code: string;

  @ApiPropertyOptional({ example: 'FR', description: 'ISO country code' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}

export class BillingDto {
  @ApiProperty({ example: 'John Dupont' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(120)
  name: string;

  @ApiProperty({ type: BillingAddressDto })
  @IsDefined({ message: 'Address is required' })
  @IsObject({ message: 'Address is required' })
  @ValidateNested()
  @Type(() => BillingAddressDto)
  address: BillingAddressDto;
}

export class CreatePurchase {
  @ApiProperty({ example: ['675fbc4b3563cd8894f79ce4'] })
  @IsArray()
  @ArrayNotEmpty({ message: 'Your cart is empty' })
  @ArrayMaxSize(20)
  @IsMongoId({ each: true, message: 'Course is invalid' })
  courseIds: string[];

  @ApiProperty({ type: BillingDto })
  @IsDefined({ message: 'Billing information is required' })
  @IsObject({ message: 'Billing information is required' })
  @ValidateNested()
  @Type(() => BillingDto)
  billing: BillingDto;
}
