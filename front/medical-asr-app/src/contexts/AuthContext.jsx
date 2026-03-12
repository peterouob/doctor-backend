import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Try to load initial user from localStorage
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("doctor_session");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Failed to parse stored session", e);
      return null;
    }
  });

  // Automatically save to localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("doctor_session", JSON.stringify(user));
    } else {
      localStorage.removeItem("doctor_session");
    }
  }, [user]);

  /**
   * Called after successful POST /doctor/login
   * @param {object} doctor - doctor record from API
   * @param {string} token  - JWT access token
   */
  const login = (doctor, token) => {
    setUser({
      id: doctor.ID ?? doctor.id,
      name: doctor.Name ?? doctor.name,
      token,
      loginAt: Date.now(),
    });
  };

  const logout = () => setUser(null);

  /** Returns the Authorization header value for authenticated requests */
  const authHeader = () => (user?.token ? { Authorization: `Bearer ${user.token}` } : {});

  return (
    <AuthContext.Provider value={{ user, login, logout, authHeader, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
