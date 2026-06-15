import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "@/frontend/components/ui/ErrorBoundary";
import "leaflet/dist/leaflet.css";

window.onerror = function(message, source, lineno, colno, error) {
  console.log("LOG FATAL:", message, "AT", source, lineno, colno, error);
};

// 1. Basmi Service Worker (Jika Ada)
// Menghindari agresif cache dari versi sebelumnya yang menyebabkan WSOD
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('ServiceWorker unregistered:', registration);
    }
  });
  // Hapus semua cache API
  if (window.caches) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
