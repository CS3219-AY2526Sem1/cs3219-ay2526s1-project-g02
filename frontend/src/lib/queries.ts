import { gql } from '@apollo/client';

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
