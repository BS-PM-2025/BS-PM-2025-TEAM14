// src/__mocks__/react-router-dom.js
import React from 'react';

// Don't use createMockFromModule as it tries to require the actual module
const reactRouterDom = {};

// Mock the Link component
reactRouterDom.Link = ({ to, children, ...rest }) => {
  return React.createElement('a', { href: to, ...rest }, children);
};

// Mock the useNavigate hook
reactRouterDom.useNavigate = () => {
  return jest.fn();
};

// Mock BrowserRouter
reactRouterDom.BrowserRouter = ({ children }) => {
  return React.createElement('div', {}, children);
};

// Mock Routes and Route
reactRouterDom.Routes = ({ children }) => {
  return React.createElement('div', { className: 'routes' }, children);
};

reactRouterDom.Route = ({ path, element }) => {
  return React.createElement('div', { className: 'route', 'data-path': path }, element);
};

// Export everything
module.exports = reactRouterDom;