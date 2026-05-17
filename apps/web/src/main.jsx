// apps/web/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const isAlerta = window.location.pathname.startsWith("/alerta/");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {isAlerta ? <AlertaPageWrapper /> : <App />}
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

function AlertaPageWrapper() {
  const [Comp, setComp] = React.useState(null);
  React.useEffect(() => {
    import('./alerta').then(m => setComp(() => m.default));
  }, []);
  if (!Comp) return <div style={{minHeight:"100vh",background:"#050505",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"#777"}}>Cargando...</p></div>;
  return <Comp />;
}
