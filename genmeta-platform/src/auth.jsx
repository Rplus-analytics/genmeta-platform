import { createContext, useContext, useState } from 'react';

/* Demo sign-in held in memory. Swap signIn for the real identity provider
   (Cognito federated to Microsoft Entra ID) when wiring the backend. */
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const signIn = (email) => {
    const name = (email.split('@')[0] || 'admin').replace(/[._-]+/g, ' ');
    const pretty = name.replace(/\b\w/g, (c) => c.toUpperCase());
    setUser({ email, name: pretty, initials: pretty.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(), role: 'Governance Lead' });
  };
  const signOut = () => setUser(null);
  return <AuthCtx.Provider value={{ user, signIn, signOut }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
