import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { UsersService } from "./users.service";
import { RegisterDto } from "./dto/register.dto";
import { LogInDto } from "./dto/logIn.dto";
import { SignOutDto } from "./dto/signOut.dto";
import { ResetPasswordDto } from "./dto/resetPassword.dto";
import { UpdatePasswordDto } from "./dto/updatePassword.dto";
import { VerifyPasswordDto } from "./dto/verifyPassword.dto";
import { DeleteAccountDto } from "./dto/deleteAccount.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    await this.userService.register(dto.email, dto.username, dto.password);
    return { message: "User registered successfully" };
  }

  @Get("register/email/check")
  async isEmailTaken(@Query("email") email: string) {
    return this.userService.isEmailTaken(email);
  }

  @Get("register/username/check")
  async isUsernameTaken(@Query("username") username: string) {
    return this.userService.isUsernameTaken(username);
  }

  @Post("login")
  async logIn(@Body() dto: LogInDto) {
    return this.userService.logIn(dto.email, dto.password);
  }

  @Post("resetpasswordlink")
  async resetPasswordLink(@Body() dto: ResetPasswordDto) {
    return this.userService.resetPasswordLink(dto.email);
  }

  @Post("updatepassword")
  async updatePassword(@Req() req: Request, @Body() dto: UpdatePasswordDto) {
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);

    return this.userService.updatePassword(dto.password, req);
  }

  @Post("verify-password")
  async verifyPassword(@Body() dto: VerifyPasswordDto) {
    try {
      const valid = await this.userService.verifyPassword(
        dto.email,
        dto.password
      );
      if (!valid) throw new Error("Invalid credentials");

      return valid;
    } catch (error) {
      console.error("Verify password error:", error);
    }
  }
  @Delete("delete")
  async deleteAccount(@Body() dto: DeleteAccountDto) {
    try {
      // Example: userId attached via middleware / session / JWT
      const userId = dto.userId;
      if (!userId) {
        throw new Error("Not authenticated");
      }

      const result = await this.userService.deleteAccountById(userId);
      return {
        message: "Account deleted successfully",
      };
    } catch (error) {
      console.error("Delete account error:", error);
    }
  }
}
