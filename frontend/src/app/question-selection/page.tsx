import { Loading } from "@/components/ui";
import { Suspense } from "react";
import { QuestionSelectionClient } from "./QuestionSelectionClient";

export default function SessionPage() {
    return (
        <Suspense fallback={<Loading />}>
            <QuestionSelectionClient />
        </Suspense>
    )
}