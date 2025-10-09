import { readFileSync } from 'fs';
import { join } from 'path';

// Export the GraphQL schema as a string
export const typeDefs = readFileSync(
  join(__dirname, 'schema.graphql'),
  'utf-8'
);

// Export TypeScript types for use in both frontend and backend
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
}

// GraphQL operation result types
export interface GetUserResponse {
  user: User | null;
}

export interface GetUsersResponse {
  users: User[];
}

export interface CreateUserResponse {
  createUser: User;
}

export interface UpdateUserResponse {
  updateUser: User;
}

export interface DeleteUserResponse {
  deleteUser: boolean;
}
