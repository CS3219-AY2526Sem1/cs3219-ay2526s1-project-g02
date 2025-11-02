export declare const typeDefs: string;
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
export interface MatchRequestInput {
    userId: string;
    language: string;
    topics: string[];
    difficulty: string;
}
export interface MatchResultOutput {
    matchFound: boolean;
    matchedUserId?: string;
    queued: boolean;
    queueKey?: string;
    requestId?: string;
    reason?: string;
}
export interface CancelMatchRequestInput {
    requestId: string;
}
export interface CancellationResultOutput {
    success: boolean;
    message?: string;
}
export * from './pubsub';
