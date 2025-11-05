import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { LlmService } from "./llm.service";
import { ProblemRequestDto, SolutionRequestDto } from "./dto/llm.dto";

@Controller()
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post("/problem")
  @HttpCode(HttpStatus.OK)
  async analyzeProblem(@Body() problemRequest: ProblemRequestDto) {
    return this.llmService.analyzeProblem(problemRequest);
  }

  @Post("/solution")
  @HttpCode(HttpStatus.OK)
  async generateSolution(@Body() solutionRequest: SolutionRequestDto) {
    return this.llmService.generateSolution(solutionRequest);
  }
}

