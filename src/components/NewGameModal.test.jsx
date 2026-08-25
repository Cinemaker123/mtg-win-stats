// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";

// The dirty-check is the safety-critical UI logic: a touched form must not be
// thrown away by a stray backdrop tap or Escape. These tests isolate that,
// so the data layer is mocked and the modal renders on its own.
vi.mock("../data/queries.js", () => ({
  useDecksQuery: () => ({
    data: { baum: [], mary: [], pascal: [], wewy: [] },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("../data/mutations.js", () => ({
  useAddDeck: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("../supabaseClient.js", () => ({
  addGame: vi.fn(),
  updateGame: vi.fn(),
  addPlayer: vi.fn(),
}));

import { NewGameModal } from "./NewGameModal.jsx";

afterEach(cleanup);

function setup() {
  const onClose = vi.fn();
  const utils = render(<NewGameModal onClose={onClose} onSaved={vi.fn()} />);
  // The overlay (backdrop) is the modal's root element.
  return { onClose, overlay: utils.container.firstChild, ...utils };
}

// Tap a player cell to crown a winner. This is the smallest "the form now has
// input" action, so the modal must go inert to a backdrop tap and Escape.
function enterInput(getByText) {
  fireEvent.click(getByText("Baum"));
}

describe("NewGameModal dirty-check", () => {
  it("closes on a backdrop tap while untouched", () => {
    const { onClose, overlay } = setup();
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the modal open on a backdrop tap after input", () => {
    const { onClose, overlay, getByText } = setup();
    enterInput(getByText);
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape while untouched", () => {
    const { onClose } = setup();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape after input", () => {
    const { onClose, getByText } = setup();
    enterInput(getByText);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
