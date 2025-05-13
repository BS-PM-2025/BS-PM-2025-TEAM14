import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Navigation from "../Navigation";
import { UserProvider } from "../../context/UserContext";

// Create a wrapper component that provides the UserContext
const renderWithUserContext = (
  ui,
  { user = null, setUserData = jest.fn() } = {}
) => {
  return render(<UserProvider>{ui}</UserProvider>);
};

describe("Navigation Component", () => {
  test("renders all navigation links", () => {
    renderWithUserContext(
      <Navigation darkMode={false} setDarkMode={jest.fn()} />,
      { user: null }
    );

    expect(screen.getByText(/Home/i)).toBeInTheDocument();
    expect(screen.getByText(/Courses/i)).toBeInTheDocument();
    expect(screen.getByText(/Grades/i)).toBeInTheDocument();
    expect(screen.getByText(/Documents/i)).toBeInTheDocument();
  });

  test("links have correct hrefs", () => {
    renderWithUserContext(
      <Navigation darkMode={false} setDarkMode={jest.fn()} />,
      { user: null }
    );

    // Test navigation using the button text and aria-label
    expect(screen.getByText(/Home/i)).toHaveAttribute("aria-label", "Home");
    expect(screen.getByText(/Courses/i)).toHaveAttribute(
      "aria-label",
      "Courses"
    );
    expect(screen.getByText(/Grades/i)).toHaveAttribute("aria-label", "Grades");
    expect(screen.getByText(/Documents/i)).toHaveAttribute(
      "aria-label",
      "Documents"
    );
  });
});
