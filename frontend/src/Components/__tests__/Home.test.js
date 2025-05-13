import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "../Home";
import { getToken, getUserFromToken, removeToken } from "../../utils/auth";
import { UserProvider } from "../../context/UserContext";

// Mock the modules
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock("../../utils/auth", () => ({
  getToken: jest.fn(),
  getUserFromToken: jest.fn(),
  removeToken: jest.fn(),
}));

// Mock framer-motion
jest.mock("framer-motion", () => {
  const actual = jest.requireActual("framer-motion");
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }) => <div {...props}>{children}</div>,
      section: ({ children, ...props }) => (
        <section {...props}>{children}</section>
      ),
      button: ({ children, ...props }) => (
        <button {...props}>{children}</button>
      ),
      footer: ({ children, ...props }) => (
        <footer {...props}>{children}</footer>
      ),
    },
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

// Create a wrapper component that provides the UserContext
const renderWithUserContext = (
  ui,
  { user = null, setUserData = jest.fn() } = {}
) => {
  return render(<UserProvider>{ui}</UserProvider>);
};

describe("Home Component", () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  test("renders welcome message for guest when no token is present", () => {
    // Set up the getToken mock to return null (no token)
    getToken.mockReturnValue(null);

    renderWithUserContext(<Home />);

    // Check guest welcome message is displayed
    expect(screen.getByText(/Hello, Guest!/i)).toBeInTheDocument();
    expect(screen.getByText(/Please log in to access/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Login Now/i })
    ).toBeInTheDocument();
  });

  test("renders user welcome when token is present", () => {
    // Set up the mocks to simulate a logged-in user
    const mockToken = "mock-token";
    const mockUser = {
      username: "testuser",
      role: "student",
    };

    getToken.mockReturnValue(mockToken);
    getUserFromToken.mockReturnValue(mockUser);

    renderWithUserContext(<Home />, { user: mockUser });

    // Check user welcome message is displayed
    expect(screen.getByText(/Hello, testuser!/i)).toBeInTheDocument();
    expect(screen.getByText(/Student/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
  });

  test("changes tab content when clicking on tab buttons", () => {
    // Set up a logged-in user
    const mockUser = { username: "testuser", role: "student" };
    getToken.mockReturnValue("mock-token");
    getUserFromToken.mockReturnValue(mockUser);

    renderWithUserContext(<Home />, { user: mockUser });

    // Dashboard should be visible by default
    expect(screen.getByText(/Dashboard Overview/i)).toBeInTheDocument();

    // Click on the Courses tab
    fireEvent.click(screen.getByRole("button", { name: /Courses/i }));
    expect(screen.getByText(/Your Courses/i)).toBeInTheDocument();

    // Click on the Grades tab
    fireEvent.click(screen.getByRole("button", { name: /Grades/i }));
    expect(screen.getByText(/Academic Performance/i)).toBeInTheDocument();

    // Click on the Documents tab
    fireEvent.click(screen.getByRole("button", { name: /Documents/i }));
    expect(screen.getByText(/Academic Documents/i)).toBeInTheDocument();
  });

  test("calls logout function when logout button is clicked", () => {
    // Set up a logged-in user
    const mockUser = { username: "testuser", role: "student" };
    getToken.mockReturnValue("mock-token");
    getUserFromToken.mockReturnValue(mockUser);

    const navigate = jest.fn();
    jest
      .spyOn(require("react-router-dom"), "useNavigate")
      .mockImplementation(() => navigate);

    renderWithUserContext(<Home />, { user: mockUser });

    // Click the logout button
    fireEvent.click(screen.getByRole("button", { name: /Logout/i }));

    // Check that removeToken was called and navigation occurred
    expect(removeToken).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/");
  });
});
