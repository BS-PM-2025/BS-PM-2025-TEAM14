import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Logout from "../Logout";
import { UserProvider } from "../../context/UserContext";
import { removeToken } from "../../utils/auth";

// Mock the modules
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
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

describe("Logout Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders logout button", () => {
    renderWithUserContext(<Logout />, { setUserData: jest.fn() });
    expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
  });

  test("calls removeToken and navigate when clicked", () => {
    const navigate = jest.fn();
    jest
      .spyOn(require("react-router-dom"), "useNavigate")
      .mockImplementation(() => navigate);

    renderWithUserContext(<Logout />, { setUserData: jest.fn() });

    fireEvent.click(screen.getByRole("button", { name: /Logout/i }));

    expect(removeToken).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/");
  });
});
