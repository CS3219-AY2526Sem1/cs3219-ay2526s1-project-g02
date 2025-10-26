import { IsString } from "class-validator";

export class SignOutDto {
  @IsString()
  access_token!: string;
}
