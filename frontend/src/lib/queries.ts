import { gql } from "@apollo/client";

// Question queries
export const GET_QUESTIONS = gql`
  query GetQuestions {
    questions {
      id
      title
      difficulty
      category
      description
      createdAt
      updatedAt
    }
  }
`;

export const GET_QUESTION = gql`
  query GetQuestion($id: String!) {
    question(id: $id) {
      id
      title
      difficulty
      category
      description
      createdAt
      updatedAt
    }
  }
`;

export const GET_QUESTIONS_BY_DIFFICULTY = gql`
  query GetQuestionsByDifficulty($difficulty: String!) {
    questionsByDifficulty(difficulty: $difficulty) {
      id
      title
      difficulty
      category
      description
    }
  }
`;

// User queries and mutations
export const REGISTER = /* GraphQL */ `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      message
    }
  }
`;

export const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      access_token
      refresh_token
      user { id email }
    }
  }
`;

export const DELETE_ACCOUNT_WITH_INPUT = `
  mutation DeleteAccount($input: DeleteAccountInput!) {
    deleteAccount(input: $input) {
      message
    }
  }
`;

export const VERIFY_PASSWORD = `
  mutation Verify($input: VerifyPasswordInput!) {
    verifyPassword(input: $input)
  }
`;

export const UPDATE_PASSWORD = `
  mutation UpdatePassword($input: UpdatePasswordInput!) {
    updatePassword(input: $input){
    message
   }
  }
`;

export const RESET_PASSWORD_LINK = `
  mutation ResetPasswordLink($input: ResetPasswordInput!) {
    resetPasswordLink(input: $input) {

      message
    }
  }
`;

export const IS_EMAIL_TAKEN = `
  query IsEmailTaken($email: String!) {
    isEmailTaken(email: $email)
  }
`;

export const IS_USERNAME_TAKEN = `
  query IsUsernameTaken($username: String!) {
    isUsernameTaken(username: $username)
  }
`;

export const MY_USERNAME_QUERY = `
  query MyUsername($id: String!) {
    myUsername(id: $id)
  }
`;

export const UPDATE_MY_USERNAME = `
  mutation UpdateMyUsername($id: String!, $username: String!) {
    updateMyUsername(id: $id, username: $username){
     message
   }
  }
`;
