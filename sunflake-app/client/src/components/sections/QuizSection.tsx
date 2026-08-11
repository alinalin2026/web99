import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { matchingConcept, resultImages } from "@/data/media";
import { SUNFLAKE_EMAIL } from "@/data/contact";
import type { QuizQuestion } from "@/i18n";

type ResultKey = "alpine" | "coastal" | "both";
type Stage = "intro" | number | "result";

function computeResult(answers: (ResultKey | undefined)[]): ResultKey {
  const counts: Record<ResultKey, number> = { alpine: 0, coastal: 0, both: 0 };
  answers.forEach((w) => {
    if (w) counts[w]++;
  });
  if (counts.alpine === counts.coastal && counts.alpine >= counts.both) {
    return "both";
  }
  return (Object.keys(counts) as ResultKey[]).reduce((best, key) =>
    counts[key] > counts[best] ? key : best
  , "both");
}

export default function QuizSection() {
  const { t } = useLanguage();
  const questions: QuizQuestion[] = t.quiz.questions;
  const [stage, setStage] = useState<Stage>("intro");
  const [answers, setAnswers] = useState<(ResultKey | undefined)[]>(
    () => new Array(questions.length).fill(undefined)
  );

  const currentIndex = typeof stage === "number" ? stage : 0;
  const currentQuestion = questions[currentIndex];

  const result = useMemo(() => computeResult(answers), [answers]);

  const selectAnswer = (weight: ResultKey) => {
    const next = [...answers];
    next[currentIndex] = weight;
    setAnswers(next);
    if (currentIndex < questions.length - 1) {
      setStage(currentIndex + 1);
    } else {
      setStage("result");
    }
  };

  const restart = () => {
    setAnswers(new Array(questions.length).fill(undefined));
    setStage("intro");
  };

  const resultData = t.quiz.results[result];
  const mailtoHref = `mailto:${SUNFLAKE_EMAIL}?subject=${encodeURIComponent(
    `${t.quiz.ctaContact} — ${resultData.title}`
  )}`;

  return (
    <section id="quiz" className="py-24 md:py-32 bg-white relative overflow-hidden">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="text-blue mb-4">{t.quiz.title}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t.quiz.subtitle}
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          {stage === "intro" && (
            <div className="text-center animate-fadeIn">
              <div className="rounded-2xl overflow-hidden shadow-md mb-8">
                <img
                  src={matchingConcept}
                  alt=""
                  className="w-full h-48 md:h-56 object-cover"
                />
              </div>
              <Button className="btn-blue" size="lg" onClick={() => setStage(0)}>
                {t.quiz.start}
              </Button>
            </div>
          )}

          {typeof stage === "number" && currentQuestion && (
            <div key={currentQuestion.id} className="animate-fadeIn">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.quiz.questionWord} {currentIndex + 1} / {questions.length}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted mb-8 overflow-hidden">
                <div
                  className="h-full bg-[#2B6BA6] rounded-full transition-all duration-500"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              <h3 className="text-2xl mb-7 text-center">{currentQuestion.prompt}</h3>

              <div className="flex flex-col gap-3">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectAnswer(opt.weight)}
                    className="text-left px-5 py-4 rounded-xl border border-border bg-[#F8F5F0] hover:border-[#E8704A] hover:bg-[#E8704A]/5 transition-all duration-200 font-medium"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setStage(currentIndex - 1)}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#E8704A] transition-colors"
                >
                  <ArrowLeft size={14} />
                  {t.quiz.back}
                </button>
              )}
            </div>
          )}

          {stage === "result" && (
            <div className="text-center animate-fadeInUp">
              <div className="rounded-2xl overflow-hidden shadow-lg mb-8">
                <img
                  src={resultImages[result]}
                  alt={resultData.title}
                  className="w-full h-56 md:h-72 object-cover"
                />
              </div>
              <h3 className="text-blue mb-4">{resultData.title}</h3>
              <p className="text-muted-foreground leading-relaxed mb-8">
                {resultData.body}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a href={mailtoHref}>
                  <Button className="btn-coral" size="lg">
                    {t.quiz.ctaContact}
                    <ArrowRight size={16} />
                  </Button>
                </a>
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#2B6BA6] transition-colors"
                >
                  <RotateCcw size={14} />
                  {t.quiz.restart}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
