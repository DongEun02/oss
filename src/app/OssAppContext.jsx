import { createContext, useContext } from "react";

const OssAppContext = createContext(null);

export const OssAppProvider = OssAppContext.Provider;

export const useOssApp = () => {
  const context = useContext(OssAppContext);
  if (!context) throw new Error("useOssApp must be used inside OssAppProvider");
  return context;
};
