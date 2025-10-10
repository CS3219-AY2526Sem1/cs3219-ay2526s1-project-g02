import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UsersService, CreateUserInput, UpdateUserInput } from './users.service';

@Resolver('User')
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query()
  async users() {
    return this.usersService.findAll();
  }

  @Query()
  async user(@Args('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Query()
  async userByEmail(@Args('email') email: string) {
    return this.usersService.findByEmail(email);
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
