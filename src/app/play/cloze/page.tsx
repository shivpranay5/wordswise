"use client";
import Quiz from "@/components/Quiz";
import { PageTitle } from "@/components/ui";
import { clozeQuestion } from "@/lib/quiz";

export default function Cloze() {
  return (
    <>
      <PageTitle title="Fill in the blank" sub="Like GRE text completion: use the context clues." back="/play" />
      <Quiz make={clozeQuestion} count={10} />
    </>
  );
}
