import { Injectable, Logger, Inject, NotFoundException } from "@nestjs/common";
import { VertexAI } from "@google-cloud/vertexai";
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

/**
 * LLM Service using Google Vertex AI (Gemini)
 * Uses GCP credits instead of OpenAI API
 */
@Injectable()
export class LlmVertexService {
  private readonly logger = new Logger(LlmVertexService.name);
  private readonly vertexAI: VertexAI;
  private readonly model: any;

  constructor(@Inject(SUPABASE) private readonly supabase: SupabaseClient) {
    const projectId = process.env.GCP_PROJECT_ID;
    const location = process.env.GCP_LOCATION || "us-central1";

    if (!projectId) {
      throw new Error("GCP_PROJECT_ID is not set in environment variables");
    }

    // Initialize Vertex AI
    this.vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });

    // Use Gemini 1.5 Flash (fast, cost-effective, free tier available)
    this.model = this.vertexAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    this.logger.log(`Vertex AI initialized with project: ${projectId}, location: ${location}`);
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
   * AI-Assisted Question Explanation using Gemini
   */
  async explainQuestion(
    request: QuestionExplanationRequestDto
  ): Promise<QuestionExplanationResponse> {
    try {
      const question = await this.getQuestion(request.questionId);

      const prompt = `You are an expert programming tutor. Your role is to explain coding problems clearly and help students understand what is being asked.

Problem: ${question.title}
Difficulty: ${question.difficulty}
Categories: ${question.category.join(", ")}

Description:
${question.description}

${question.examples ? `Examples:\n${question.examples}` : ""}
${question.constraints ? `Constraints:\n${question.constraints}` : ""}

Please provide:
1. A clear breakdown of what the problem is asking
2. Key concepts and data structures that might be relevant
3. Possible approaches to consider (high-level, not complete solutions)
4. Helpful hints for solving it
5. Expected complexity considerations

Focus on being clear, educational, and encouraging.`;

      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      });

      const response = result.response;
      const explanation = response.candidates[0]?.content?.parts[0]?.text || "";

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
   * AI-Assisted Problem Solving Chat with Streaming
   */
  async *chatStream(request: ChatRequestDto): AsyncGenerator<string, void, unknown> {
    try {
      const question = await this.getQuestion(request.questionId);

      const currentCodeSection = request.currentCode 
        ? `\n\nCurrent code written by the user:\n\`\`\`\n${request.currentCode}\n\`\`\``
        : "";

      const systemContext = `You are a helpful programming assistant helping users solve coding problems.

Problem: ${question.title}
Difficulty: ${question.difficulty}
Categories: ${question.category.join(", ")}

Description:
${question.description}

${question.examples ? `Examples:\n${question.examples}` : ""}
${question.constraints ? `Constraints:\n${question.constraints}` : ""}${currentCodeSection}

Your role:
- Provide hints and guidance without giving away the complete solution
- Help users understand the problem statement
- Suggest possible approaches and data structures
- Explain concepts when asked
- Be encouraging and educational
- Reference the user's current code when relevant

Do not provide complete working code unless explicitly requested. Focus on teaching and guiding.`;

      // Build conversation history for Gemini format
      const contents = [];
      
      // Add system context as first user message
      contents.push({
        role: "user",
        parts: [{ text: systemContext }],
      });
      
      // Add conversation history if available
      if (request.conversationHistory && request.conversationHistory.length > 0) {
        for (const msg of request.conversationHistory) {
          contents.push({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          });
        }
      }
      
      // Add current user message
      contents.push({
        role: "user",
        parts: [{ text: request.message }],
      });

      // Generate streaming response
      const result = await this.model.generateContentStream({
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      // Stream chunks to client
      for await (const chunk of result.stream) {
        const text = chunk.candidates[0]?.content?.parts[0]?.text || "";
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      this.logger.error("Error in chatStream:", error);
      throw error;
    }
  }
}

