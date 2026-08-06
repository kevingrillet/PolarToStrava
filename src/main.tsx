/** Point d'entrée : monte l'application React dans le DOM. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Le thème (identité + mode clair/sombre) est appliqué AVANT le rendu par le
// script anti-flash de index.html, puis géré au runtime par `useTheme`.

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Élément racine #root introuvable');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
