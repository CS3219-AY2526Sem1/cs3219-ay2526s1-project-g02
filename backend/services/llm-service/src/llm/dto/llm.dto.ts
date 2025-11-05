import { IsString, IsOptional, IsArray, IsObject } from "class-validator";

// DTO for question explanation request
export class QuestionExplanationRequestDto {
  @IsString()
  questionId: string;
}

// DTO for question explanation response
export interface QuestionExplanationResponse {
  questionId: string;
  explanation: string;
  analysis: {
    keyconcepts: string[];
    approaches: string[];
    hints: string[];
    complexity: string;
  };
  timestamp: string;
}

// DTO for chat request (problem-solving)
export class ChatRequestDto {
  @IsString()
  questionId: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  conversationHistory?: ChatMessage[];
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// DTO for chat response (streaming)
export interface ChatResponse {
  questionId: string;
  message: string;
  timestamp: string;
}

// Legacy DTOs (kept for backward compatibility)
export class ProblemRequestDto {
  @IsString()
  questioId: string; // Note: typo preserved for backward compatibility
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
