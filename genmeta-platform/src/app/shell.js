import { createContext, useContext } from 'react';

/* The GenMeta sidebar's collapsed state, shared so in-page rails (Admin) can take turns with it. */
export const ShellCtx = createContext({ collapsed: false, setCollapsed: () => {} });
export const useShell = () => useContext(ShellCtx);
