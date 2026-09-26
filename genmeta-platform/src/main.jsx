import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';
import './pro.css';
import './catalogue.css';

/* Hosted build has no server for deep URLs, so routing stays in memory */
const Router = import.meta.env.VITE_TARGET === 'artifact' ? MemoryRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
