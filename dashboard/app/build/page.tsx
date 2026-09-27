import type { Metadata } from "next";
import BuildQuiz from "./BuildQuiz";

export const metadata: Metadata = {
  title: "Build your website — Web99",
  robots: { index: false, follow: false },
};

export default function BuildPage() {
  return <BuildQuiz />;
}
