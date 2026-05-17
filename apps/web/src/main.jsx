// apps/web/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import AlertaPage from './alerta';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// Si la URL es /alerta/:id → mostrar panel de respuesta (sin login)
const isAlerta = window.location.pathname.startsWith("/alerta/");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {isAlerta ? <AlertaPage /> : <App />}
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
