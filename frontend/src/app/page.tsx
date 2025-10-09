'use client';

import { useQuery, gql } from '@apollo/client';
import { GetUsersResponse } from '@noclue/common';

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      email
      name
      createdAt
    }
  }
`;

export default function Home() {
  const { loading, error, data } = useQuery<GetUsersResponse>(GET_USERS);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Welcome to NoClue App</h1>
      <p>Full-stack application with Next.js frontend and NestJS backend</p>

      <div style={{ marginTop: '2rem' }}>
        <h2>Users</h2>
        {loading && <p>Loading...</p>}
        {error && <p>Error: {error.message}</p>}
        {data && (
          <ul>
            {data.users.map((user) => (
              <li key={user.id}>
                {user.name} - {user.email}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
