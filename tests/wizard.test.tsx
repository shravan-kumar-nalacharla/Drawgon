import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { Wizard } from "../src/components/Wizard";
import { defaultSettings } from "../src/config/settings";
it("requires a title before continuing and exposes accessible project fields", () => {
  const update = vi.fn();
  render(
    <Wizard
      session={{
        project: {
          title: "",
          abstract: "",
          repositoryUrl: "",
          details: {},
          techStack: [],
        },
        settings: defaultSettings,
        selected: [],
        diagrams: [],
      }}
      update={update}
      step={1}
      setStep={vi.fn()}
      onRepository={vi.fn()}
      onSuggest={vi.fn()}
      onGenerate={vi.fn()}
      busy={false}
      status=""
      repoError=""
      stale={false}
    />,
  );
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Project title"), {
    target: { value: "Library" },
  });
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      project: expect.objectContaining({ title: "Library" }),
    }),
  );
});
