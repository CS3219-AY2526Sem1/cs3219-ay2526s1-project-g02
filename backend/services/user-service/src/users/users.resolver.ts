import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
  Context,
  Int,
} from "@nestjs/graphql";
import { UsersService } from "./users.service";
import { UserResponse } from "./model/response.model";
import { RegisterInput } from "./dto/register.input";
import { LoginInput } from "./dto/logIn.input";
import { AuthPayload } from "./model/auth-payload.model";
import { DeleteAccountInput } from "./dto/deleteAccount.input";
import { ApolloError } from "apollo-server-errors";
import { VerifyPasswordInput } from "./dto/verifyPassword.input";
import { ResetPasswordInput } from "./dto/resetPassword.input";
import { GqlUser } from "./model/user.model";

@Resolver()
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Mutation(() => UserResponse, { name: "register" })
  async register(@Args("input") input: RegisterInput): Promise<UserResponse> {
    await this.usersService.register(
      input.email,
      input.username, // may be undefined; handle in service if needed
      input.password
    );
    return { message: "User registered successfully" };
  }

  @Mutation(() => AuthPayload, { name: "login" })
  async login(@Args("input") input: LoginInput): Promise<AuthPayload> {
    return await this.usersService.login(input.email, input.password);
  }

  @Mutation(() => UserResponse, { name: "deleteAccount" })
  async deleteAccount(
    @Args("input") input: DeleteAccountInput
  ): Promise<UserResponse> {
    const userId = input.userId;
    if (!userId) {
      throw new ApolloError("Not authenticated", "UNAUTHENTICATED", {
        status: 401,
      });
    }
    await this.usersService.deleteAccountById(userId);
    return { message: "Account deleted successfully" };
  }

  @Mutation(() => Boolean, { name: "verifyPassword" })
  async verifyPassword(
    @Args("input") input: VerifyPasswordInput
  ): Promise<boolean> {
    const valid = await this.usersService.verifyPassword(
      input.email,
      input.password
    );
    if (!valid) {
      // surfaces in json.errors with extensions.status for FE to branch on
      throw new ApolloError("Invalid credentials", "UNAUTHORIZED", {
        status: 401,
      });
    }
    return true;
  }
  @Mutation(() => UserResponse, { name: "resetPasswordLink" })
  async resetPasswordLink(
    @Args("input") input: ResetPasswordInput
  ): Promise<UserResponse> {
    return this.usersService.resetPasswordLink(input.email);
  }
  @Query(() => Boolean, { name: "isEmailTaken" })
  async isEmailTaken(@Args("email") email: string): Promise<boolean> {
    return this.usersService.isEmailTaken(email);
  }
  @Query(() => Boolean, { name: "isUsernameTaken" })
  async isUsernameTaken(@Args("username") username: string): Promise<boolean> {
    return this.usersService.isUsernameTaken(username);
  }

  @Query(() => String, { name: "myUsername", nullable: true })
  async myUsername(@Args("id", { type: () => String }) id: string) {
    const username = await this.usersService.getMyUsername(id);

    return username;
  }

  @Mutation(() => UserResponse, { name: "updateMyUsername" })
  async updateMyUsername(
    @Args("id", { type: () => String }) id: string,
    @Args("username", { type: () => String }) username: string
  ) {
    console.log("ID", id);
    console.log("username", username);
    return this.usersService.updateMyUsername(id, username);
  }

  @Query(() => String, { name: "ping" })
  ping() {
    return "pong";
  }

  @Query(() => [GqlUser], { name: "users" })
  async getUsers(@Args("user_ids", { type: () => [String] }) userIds: string[]): Promise<GqlUser[]> {
    return this.usersService.getUsersByIds(userIds);
  }
}
