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

    expect(screen.getByRole("link", { name: /Home/i })).toHaveAttribute(
      "href",
      "/"
    );
    expect(screen.getByRole("link", { name: /Courses/i })).toHaveAttribute(
      "href",
      "/courses"
    );
    expect(screen.getByRole("link", { name: /Grades/i })).toHaveAttribute(
      "href",
      "/grades"
    );
    expect(screen.getByRole("link", { name: /Documents/i })).toHaveAttribute(
      "href",
      "/documents"
    );
  });
});
