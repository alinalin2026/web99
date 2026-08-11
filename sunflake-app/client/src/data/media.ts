import beachView from "@/assets/sunflake_beach_view.webp";
import heroImage from "@/assets/sunflake_hero.webp";
import logoIcon from "@/assets/sunflake_logo_icon.webp";
import logoLockup from "@/assets/sunflake_logo_lockup.webp";
import matchingConcept from "@/assets/sunflake_matching_concept.webp";
import mountainView from "@/assets/sunflake_mountain_view.webp";

export { beachView, heroImage, logoIcon, logoLockup, matchingConcept, mountainView };

export const storyImages: Record<string, string> = {
  "alps-cabin-escape": mountainView,
  "mediterranean-terrace": beachView,
  "snow-to-sand": heroImage,
};

export const resultImages: Record<"alpine" | "coastal" | "both", string> = {
  alpine: mountainView,
  coastal: beachView,
  both: heroImage,
};
