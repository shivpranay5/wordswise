export function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  const voices = synth.getVoices();
  const v =
    voices.find((x) => x.lang === "en-US" && /natural|google|samantha|aria|jenny/i.test(x.name)) ??
    voices.find((x) => x.lang.startsWith("en"));
  if (v) u.voice = v;
  synth.speak(u);
}

/** Replace {{x}} in a cloze sentence. */
export function clozeParts(cloze: string): { before: string; answer: string; after: string } {
  const m = cloze.match(/^([\s\S]*?)\{\{(.+?)\}\}([\s\S]*)$/);
  if (!m) return { before: cloze, answer: "", after: "" };
  return { before: m[1], answer: m[2], after: m[3] };
}

export function clozePlain(cloze: string): string {
  return cloze.replace(/\{\{(.+?)\}\}/g, "$1");
}
