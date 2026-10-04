"use client";
import { GameGrid, PageTitle } from "@/components/ui";

export default function Play() {
  return (
    <>
      <PageTitle title="Practice & play" sub="Games use the words you're learning — misses go back into your review pile." />
      <GameGrid />
    </>
  );
}
