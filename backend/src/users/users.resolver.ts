import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { CreateUserInput, UpdateUserInput } from '@noclue/common';

@Resolver('User')
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query()
  hello(): string {
    return 'Hello from NestJS GraphQL!';
  }

  @Query()
  async users() {
    return this.usersService.findAll();
  }

  @Query()
  async user(@Args('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Mutation()
  async createUser(@Args('input') input: CreateUserInput) {
    return this.usersService.create(input);
  }

  @Mutation()
  async updateUser(
    @Args('id') id: string,
    @Args('input') input: UpdateUserInput,
  ) {
    return this.usersService.update(id, input);
  }

  @Mutation()
  async deleteUser(@Args('id') id: string) {
    return this.usersService.delete(id);
  }
}
