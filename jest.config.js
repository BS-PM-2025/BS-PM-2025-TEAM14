module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__mocks__/styleMock.js',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/src/__mocks__/fileMock.js',
    '^react-router-dom$': '<rootDir>/src/__mocks__/react-router-dom.js'
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleDirectories: ['node_modules', 'src'],
  // This tells Jest to ignore these directories when testing
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  // This ensures coverage reports include all source files
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/index.js',
    '!src/reportWebVitals.js'
  ]
};