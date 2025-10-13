import { Injectable } from "@nestjs/common";
import { User } from "./interface/user.interface";

@Injectable()
export class UsersService {
  private readonly users: User[] = [];

  register() {}

  findAll(): User[] {
    return this.users;
  }
}
