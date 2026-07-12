import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ObjectiveMasteryHeatmap } from "@/components/heatmaps/objective-mastery-heatmap";
import type { KMDomain, KMObjective } from "@/lib/db/knowledge-map";

const OBJECTIVES_PER_DOMAIN = [4, 5, 4, 9, 6];

function objective(code: string, conceptCount: number): KMObjective {
  return {
    id: `objective-${code}`,
    code,
    title: `Objective title ${code}`,
    isPlaceholder: false,
    mastery: 0,
    masteryState: "unseen",
    masteredConcepts: 0,
    totalConcepts: conceptCount,
    reviewDue: false,
    dueConcepts: 0,
    recommendedAction: `Start objective ${code}.`,
    recentMistakes: [],
    prerequisiteGaps: [],
    concepts: Array.from({ length: conceptCount }, (_, index) => ({
      id: `concept-${code}-${index}`,
      objectiveId: `objective-${code}`,
      name: `Concept ${code}.${index + 1}`,
      slug: `concept-${code}-${index}`,
      mastery: 0,
      state: "UNSEEN",
      attemptCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      nextReview: null,
      isPlaceholder: false,
    })),
  };
}

function securityPlusDomains(): KMDomain[] {
  let objectiveIndex = 0;
  return OBJECTIVES_PER_DOMAIN.map((count, domainIndex) => ({
    id: `domain-${domainIndex + 1}`,
    code: `${domainIndex + 1}`,
    title: `Domain ${domainIndex + 1}`,
    weight: [12, 22, 18, 28, 20][domainIndex],
    mastery: 0,
    objectives: Array.from({ length: count }, (_, index) => {
      const code = `${domainIndex + 1}.${index + 1}`;
      const conceptCount = objectiveIndex++ < 14 ? 4 : 3;
      return objective(code, conceptCount);
    }),
  }));
}

describe("ObjectiveMasteryHeatmap", () => {
  it("renders the complete Security+ objective structure", () => {
    const domains = securityPlusDomains();
    const { container } = render(<ObjectiveMasteryHeatmap domains={domains} />);

    expect(container.querySelectorAll(".mastery-cell")).toHaveLength(28);
    expect(domains.flatMap((domain) => domain.objectives)).toHaveLength(28);
    expect(
      domains.flatMap((domain) =>
        domain.objectives.flatMap((item) => item.concepts),
      ),
    ).toHaveLength(98);
    for (const domain of domains) {
      expect(
        screen.getByRole("heading", { name: new RegExp(domain.title) }),
      ).toBeVisible();
    }
  });

  it("opens objective details with keyboard activation", async () => {
    const user = userEvent.setup();
    render(<ObjectiveMasteryHeatmap domains={securityPlusDomains()} />);
    const cell = screen.getByRole("button", {
      name: /1\.2 Objective title 1\.2/,
    });

    cell.focus();
    await user.keyboard("{Enter}");

    expect(cell).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("heading", { name: "Objective title 1.2" }),
    ).toBeVisible();
  });
});
