import React, { createContext, useContext, useState } from "react";

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  return (
    <UserContext.Provider value={{ user, setUser, userData, setUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
