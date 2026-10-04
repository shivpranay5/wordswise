"use client";
import Quiz from "@/components/Quiz";
import { PageTitle } from "@/components/ui";
import { mcQuestion } from "@/lib/quiz";

export default function Speed() {
  return (
    <>
      <PageTitle title="Speed round" sub="As many as you can in 60 seconds." back="/play" />
      <Quiz make={(w, all) => mcQuestion(w, all, "d2w")} seconds={60} bestKey="best:speed" />
    </>
  );
}
