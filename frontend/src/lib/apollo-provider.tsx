'use client';

import { ApolloProvider } from '@apollo/client';
import { userClient } from './apollo-client';

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={userClient}>{children}</ApolloProvider>;
}
