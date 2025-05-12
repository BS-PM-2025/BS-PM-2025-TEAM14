// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

// Mock the UserContext
jest.mock("./context/UserContext", () => ({
  useUser: () => ({
    user: {
      id: "1",
      name: "Test User",
      role: "student",
    },
    setUserData: jest.fn(),
    userData: {
      id: "1",
      name: "Test User",
      role: "student",
    },
  }),
}));

// Mock axios
jest.mock("axios", () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Configure testing library
configure({
  testIdAttribute: "data-testid",
});
