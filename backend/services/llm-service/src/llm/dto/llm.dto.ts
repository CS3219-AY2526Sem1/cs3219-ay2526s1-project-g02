import { IsString, IsOptional, IsArray } from "class-validator";

export class ProblemRequestDto {
  @IsString()
  questioId: string;
}

export class SolutionRequestDto {
  @IsString()
  questionId: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  existingCode?: string;
}

