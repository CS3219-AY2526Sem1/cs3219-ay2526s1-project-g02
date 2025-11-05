import { gql } from '@apollo/client';

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

export const SUBMIT_QUESTION_SELECTION = gql`
  mutation SubmitQuestionSelection($input: SubmitQuestionSelectionInput!) {
    submitQuestionSelection(input: $input) {
      status
      pendingUserIds
      selections {
        userId
        questionId
        isWinner
        submittedAt
        finalizedAt
      }
      finalQuestion {
        id
        title
        difficulty
        category
        description
      }
    }
  }
`;

export const QUESTION_SELECTION_STATUS = gql`
  query QuestionSelectionStatus($matchId: ID!) {
    questionSelectionStatus(matchId: $matchId) {
      status
      pendingUserIds
      selections {
        userId
        questionId
        isWinner
        submittedAt
        finalizedAt
      }
      finalQuestion {
        id
        title
        difficulty
        category
        description
      }
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers($user_ids: [String!]!) {
    users(user_ids: $user_ids) {
      id
      email
      name
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
    }
    message
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

// Collaboration/Session queries
export const GET_SESSION_WITH_DETAILS = gql`
  query GetSessionWithDetails($sessionId: String!, $userId: String) {
    sessionWithDetails(sessionId: $sessionId, userId: $userId) {
      id
      match_id
      question_id
      code
      language
      status
      end_at
      created_at
      updated_at
      match {
        id
        user1_id
        user2_id
        status
        created_at
        ended_at
      }
      question {
        id
        title
        description
        difficulty
        category
        examples
        constraints
        created_at
        updated_at
      }
    }
  }
`;

export const SESSION_BY_MATCH = gql`
  query SessionByMatch($matchId: String!) {
    sessionByMatch(matchId: $matchId) {
      id
      match_id
      question_id
      code
      language
      status
      end_at
      created_at
      updated_at
    }
  }
`;

export const IS_USER_PART_OF_SESSION = gql`
  query IsUserPartOfSession($sessionId: String!, $userId: String!) {
    isUserPartOfSession(sessionId: $sessionId, userId: $userId)
  }
`;

export const END_SESSION = gql`
  mutation EndSession($sessionId: String!) {
    endSession(sessionId: $sessionId) {
      id
      status
      end_at
    }
  }
`;
