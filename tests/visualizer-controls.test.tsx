import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Control } from "../src/visualizer/components/Primitives";
describe("bounded lab controls", () => {
  it("rounds architecture sizes and clamps out-of-range inputs", () => {
    const change = vi.fn();
    render(
      <Control
        label="Depth"
        value={2}
        min={0}
        max={3}
        step={1}
        onChange={change}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: "Depth value" }), {
      target: { value: "1.5" },
    });
    expect(change).toHaveBeenLastCalledWith(2);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Depth value" }), {
      target: { value: "100" },
    });
    expect(change).toHaveBeenLastCalledWith(3);
  });
});
