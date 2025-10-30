"use client";

import { useQuery, gql } from "@apollo/client";
import { GetUsersResponse } from "@noclue/common";

export default function Home() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Welcome to NoClue App</h1>
      <p>Full-stack application with Next.js frontend and NestJS backend</p>

      <div style={{ marginTop: "2rem" }}>
        <h2>Users</h2>
      </div>
    </main>
  );
}
