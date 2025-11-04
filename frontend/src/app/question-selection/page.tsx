"use client";

import { useQuery } from "@apollo/client";
import { GET_QUESTIONS } from "@/lib/queries";
import { questionClient } from "@/lib/apollo-client";
import { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  DifficultyBadge,
  UserCard,
  Loading,
} from "@/components/ui";
import { PageLayout, Sidebar, PageHeader } from "@/components/layout";
import NavBar from "@/components/NavBar";

interface Question {
  id: string;
  title: string;
  difficulty: string;
  category: string[];
}

interface User {
  username: string;
  role: string;
  joinedDate: string;
}

export default function SessionPage() {
  const { loading, error, data } = useQuery(GET_QUESTIONS, {
    client: questionClient,
  });
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  // Mock users data - replace with actual data from your backend
  const users: User[] = [
    {
      username: "@juliusagambe",
      role: "React Dev",
      joinedDate: "Joined December 2021",
    },
    {
      username: "@alfredchen",
      role: "Java lover",
      joinedDate: "Joined December 2021",
    },
  ];

  if (loading) {
    return (
      <PageLayout header={<NavBar></NavBar>}>
        <Loading message="Loading questions..." />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout header={<NavBar></NavBar>}>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="text-red-600">Error: {error.message}</div>
        </div>
      </PageLayout>
    );
  }

  const questions: Question[] = data?.questions || [];

  // Sidebar bottom content (users and buttons)
  const sidebarBottom = (
    <>
      {/* Participants */}
      <div className="space-y-3">
        {users.map((user, index) => (
          <UserCard
            key={index}
            username={user.username}
            role={user.role}
            joinedDate={user.joinedDate}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Button disabled={!selectedQuestion}>Submit Answer</Button>
        <Button variant="danger">Leave Session</Button>
      </div>
    </>
  );

  return (
    <PageLayout
      header={<PageHeader title="No Clue" />}
      sidebar={
        <Sidebar title="Select Question:" bottomContent={sidebarBottom} />
      }
    >
      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question) => (
          <Card
            key={question.id}
            onClick={() => setSelectedQuestion(question.id)}
            selected={selectedQuestion === question.id}
          >
            <CardHeader>
              <CardTitle>{question.title}</CardTitle>
              <CardContent>
                <span className="font-normal">
                  Topics: {question.category.join(", ")}
                </span>
              </CardContent>
              <div className="flex items-center gap-2">
                <DifficultyBadge difficulty={question.difficulty} />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
