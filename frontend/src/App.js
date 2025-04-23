// App.jsx
import React from "react";
import { UserProvider } from "./Components/UserContext"; // Wrap everything here
import AppRoutes from "./Components/AppRoutes"; // Move all routing into a subcomponent

function App() {
  return (
      <UserProvider>
        <AppRoutes />
      </UserProvider>
  );
}

export default App;
