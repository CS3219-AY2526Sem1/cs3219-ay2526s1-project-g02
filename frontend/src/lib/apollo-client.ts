import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_MATCHING_GRAPHQL_URL || 'http://localhost:4003/graphql',
});
    
export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});

// Collaboration service client
const collaborationHttpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_COLLABORATION_GRAPHQL_URL || 'http://localhost:4004/graphql',
});

export const collaborationClient = new ApolloClient({
  link: collaborationHttpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});

// Question service client
const questionHttpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_QUESTION_GRAPHQL_URL || 'http://localhost:4002/graphql',
});

export const questionClient = new ApolloClient({
  link: questionHttpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});

// User service client
const userHttpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_USER_GRAPHQL_URL || 'http://localhost:4001/graphql',
});

export const userClient = new ApolloClient({
  link: userHttpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
