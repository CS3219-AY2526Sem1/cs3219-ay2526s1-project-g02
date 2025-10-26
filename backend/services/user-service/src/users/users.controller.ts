import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { Request } from "express";
import { UsersService } from "./users.service";
import { RegisterDto } from "./dto/register.dto";
import { LogInDto } from "./dto/logIn.dto";
import { SignOutDto } from "./dto/signOut.dto";
import { ResetPasswordDto } from "./dto/resetPassword.dto";
import { UpdatePasswordDto } from "./dto/updatePassword.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    return this.userService.register(dto.email, dto.username, dto.password);
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

  @Post("signout")
  async signout(@Body() dto: SignOutDto) {
    return this.userService.signOut(dto.access_token);
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
}
