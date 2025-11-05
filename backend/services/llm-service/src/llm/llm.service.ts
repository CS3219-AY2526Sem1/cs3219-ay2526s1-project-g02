import { Injectable, Logger, Inject, NotFoundException } from "@nestjs/common";
import OpenAI from "openai";
import { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE } from "../supabase/supabase.module";
import {
  QuestionExplanationRequestDto,
  QuestionExplanationResponse,
  ChatRequestDto,
  ChatMessage,
} from "./dto/llm.dto";

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string[];
  examples?: string;
  constraints?: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly openai: OpenAI;

  constructor(@Inject(SUPABASE) private readonly supabase: SupabaseClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in environment variables");
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Fetch question from Supabase
   */
  private async getQuestion(questionId: string): Promise<Question> {
    const { data, error } = await this.supabase
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .single();

    if (error || !data) {
      this.logger.error(`Failed to fetch question ${questionId}:`, error);
      throw new NotFoundException(
        `Question with ID ${questionId} not found`
      );
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      category: data.category,
      examples: data.examples,
      constraints: data.constraints,
    };
  }

  /**
   * AI-Assisted Question Explanation
   * Explains the problem/question to help users understand it better
   */
  async explainQuestion(
    request: QuestionExplanationRequestDto
  ): Promise<QuestionExplanationResponse> {
    try {
      const question = await this.getQuestion(request.questionId);

      const systemPrompt = `You are an expert programming tutor. Your role is to explain coding problems clearly and help students understand what is being asked.

Focus on:
1. Breaking down the problem statement
2. Identifying key concepts and data structures that might be useful
3. Suggesting possible approaches (without providing complete solutions)
4. Providing helpful hints
5. Explaining expected time/space complexity considerations

Be clear, educational, and encouraging.`;

      const userPrompt = `Please explain this coding problem to help me understand it better:

Problem: ${question.title}
Difficulty: ${question.difficulty}

Description:
${question.description}

${question.examples ? `Examples:\n${question.examples}` : ""}
${question.constraints ? `Constraints:\n${question.constraints}` : ""}

Please provide:
1. A clear breakdown of what the problem is asking
2. Key concepts and data structures that might be relevant
3. Possible approaches to consider (high-level, not complete solutions)
4. Helpful hints for solving it
5. Expected complexity considerations`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const explanation = completion.choices[0]?.message?.content || "";

      // Parse the response to extract structured information
      const analysis = this.parseQuestionExplanation(explanation);

      return {
        questionId: request.questionId,
        explanation,
        analysis,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error in explainQuestion:", error);
      throw error;
    }
  }

  /**
   * Parse question explanation to extract structured data
   */
  private parseQuestionExplanation(explanation: string) {
    return {
      keyconcepts: this.extractList(explanation, "key concepts|concepts") || [],
      approaches: this.extractList(explanation, "approaches|approach") || [],
      hints: this.extractList(explanation, "hints|hint") || [],
      complexity: this.extractSection(explanation, "complexity") || "See full explanation",
    };
  }

  private extractSection(text: string, sectionName: string): string | null {
    const regex = new RegExp(`${sectionName}[:\\s]+(.*?)(?=\\n\\n|\\n[A-Z]|$)`, "is");
    const match = text.match(regex);
    return match && match[1] ? match[1].trim() : null;
  }

  private extractList(text: string, sectionName: string): string[] {
    const section = this.extractSection(text, sectionName);
    if (!section) return [];
    
    const lines = section.split("\n");
    return lines
      .filter(line => line.trim().match(/^[-*\d.]/))
      .map(line => line.replace(/^[-*\d.]\s*/, "").trim())
      .filter(line => line.length > 0);
  }

  /**
   * AI-Assisted Problem Solving Chat (Streaming)
   * Returns an async generator for streaming responses
   */
  async *chatStream(request: ChatRequestDto): AsyncGenerator<string, void, unknown> {
    try {
      const question = await this.getQuestion(request.questionId);

      const systemPrompt = `You are a helpful programming assistant helping users solve coding problems.

Problem: ${question.title}
Difficulty: ${question.difficulty}
Categories: ${question.category.join(", ")}

Description:
${question.description}

${question.examples ? `Examples:\n${question.examples}` : ""}
${question.constraints ? `Constraints:\n${question.constraints}` : ""}

Your role:
- Provide hints and guidance without giving away the complete solution
- Help users understand the problem statement
- Suggest possible approaches and data structures
- Explain concepts when asked
- Be encouraging and educational

Do not provide complete working code unless explicitly requested. Focus on teaching and guiding.`;

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...(request.conversationHistory || []),
        { role: "user", content: request.message },
      ];

      const stream = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      this.logger.error("Error in chatStream:", error);
      throw error;
    }
  }
}