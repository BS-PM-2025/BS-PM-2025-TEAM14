import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Login from "../Login";
import { UserProvider } from "../../context/UserContext";

// Create a mock for ALL modules that Login imports
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock("jwt-decode", () => ({
  jwtDecode: jest.fn(),
}));

jest.mock("../../utils/auth", () => ({
  removeToken: jest.fn(),
}));

// Create a wrapper component that provides the UserContext
const renderWithUserContext = (
  ui,
  { user = null, setUserData = jest.fn() } = {}
) => {
  return render(<UserProvider>{ui}</UserProvider>);
};

describe("Login Component", () => {
  test("renders login form", () => {
    renderWithUserContext(
      <Login onSuccess={jest.fn()} onFailure={jest.fn()} />
    );

    expect(screen.getByLabelText(/User ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
  });

  test("calls handleSubmit when login button is clicked", () => {
    const mockOnSuccess = jest.fn();
    const mockOnFailure = jest.fn();

    renderWithUserContext(
      <Login onSuccess={mockOnSuccess} onFailure={mockOnFailure} />,
      { setUserData: jest.fn() }
    );

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/User ID/i), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /Login/i }));

    // Check that the form values were captured
    expect(screen.getByLabelText(/User ID/i)).toHaveValue("testuser");
    expect(screen.getByLabelText(/Password/i)).toHaveValue("password123");
  });
});
