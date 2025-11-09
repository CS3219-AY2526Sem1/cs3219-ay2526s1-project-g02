import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Sse,
  MessageEvent,
  Inject,
} from "@nestjs/common";
import { Response } from "express";
import { Observable } from "rxjs";
import { LlmService } from "./llm.service";
import { LLM_SERVICE } from "./llm.module";
import {
  QuestionExplanationRequestDto,
  ChatRequestDto,
} from "./dto/llm.dto";

@Controller('llm')
export class LlmController {
  constructor(
    @Inject(LLM_SERVICE) private readonly llmService: LlmService
  ) {}

  /**
   * POST /llm/explain-question
   * AI-assisted question explanation endpoint
   */
  @Post("/explain-question")
  @HttpCode(HttpStatus.OK)
  async explainQuestion(@Body() request: QuestionExplanationRequestDto) {
    return this.llmService.explainQuestion(request);
  }

  /**
   * POST /llm/chat
   * AI-assisted problem-solving chat with streaming
   * Uses Server-Sent Events (SSE) for real-time streaming
   */
  @Post("/chat")
  async chat(
    @Body() request: ChatRequestDto,
    @Res() response: Response
  ) {
    // Set up SSE headers
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    try {
      const stream = this.llmService.chatStream(request);

      for await (const chunk of stream) {
        // Send each chunk as SSE data
        response.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      // Send completion signal
      response.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      response.end();
    } catch (error) {
      response.write(
        `data: ${JSON.stringify({ 
          error: "An error occurred while processing your request",
          details: error.message 
        })}\n\n`
      );
      response.end();
    }
  }
}
