import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

/** AU-3: ≥12 znaków, ≥1 wielka, ≥1 cyfra, ≥1 specjalny */
const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  @Matches(PASSWORD_RULE, {
    message:
      'password must be ≥12 chars with upper, digit, and special character',
  })
  password!: string;
}
