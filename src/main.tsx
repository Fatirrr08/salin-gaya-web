import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "@/frontend/components/ui/ErrorBoundary";

window.onerror = function(message, source, lineno, colno, error) {
  console.log("LOG FATAL:", message, "AT", source, lineno, colno, error);
};

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
