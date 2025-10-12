"use client";

import { createContext, ReactNode, useContext, useState } from "react";

interface DisplayTokenContextType {
  tokenAddress: string | null;
  setTokenAddress: (address: string | null) => void;
}

const DisplayTokenContext = createContext<DisplayTokenContextType | undefined>(
  undefined,
);

export function DisplayTokenProvider({ children }: { children: ReactNode }) {
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);

  return (
    <DisplayTokenContext.Provider value={{ tokenAddress, setTokenAddress }}>
      {children}
    </DisplayTokenContext.Provider>
  );
}

export function useDisplayToken() {
  const context = useContext(DisplayTokenContext);
  if (context === undefined) {
    throw new Error(
      "useDisplayToken must be used within a DisplayTokenProvider",
    );
  }
  return context;
}
