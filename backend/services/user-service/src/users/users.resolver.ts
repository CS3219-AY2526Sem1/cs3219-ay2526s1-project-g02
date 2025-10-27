import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';

@Resolver('User')
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => [String])
  async users() {
    return this.usersService.findAll();
  }

  @Query(() => String)
  async user(@Args({ name: 'id', type: () => String }) id: string) {
    return this.usersService.findOne(id);
  }

  @Query(() => String)
  async userByEmail(@Args({ name: 'email', type: () => String }) email: string) {
    return this.usersService.findByEmail(email);
  }

  @Mutation(() => String)
  async createUser(@Args('input') input: CreateUserInput) {
    return this.usersService.create(input);
  }

  @Mutation(() => String)
  async updateUser(
    @Args({ name: 'id', type: () => String }) id: string,
    @Args('input') input: UpdateUserInput,
  ) {
    return this.usersService.update(id, input);
  }

  @Mutation(() => Boolean)
  async deleteUser(@Args({ name: 'id', type: () => String }) id: string) {
    return this.usersService.delete(id);
  }
}
