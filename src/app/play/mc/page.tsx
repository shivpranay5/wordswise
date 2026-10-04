"use client";
import Quiz from "@/components/Quiz";
import { PageTitle } from "@/components/ui";
import { mcQuestion } from "@/lib/quiz";

export default function MC() {
  return (
    <>
      <PageTitle title="Multiple choice" sub="Words you're studying, weakest first." back="/play" />
      <Quiz make={(w, all) => mcQuestion(w, all)} count={10} />
    </>
  );
}
