import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { ToastProvider } from './context/ToastContext';
import { ChatSocketProvider } from './context/ChatSocketContext';
import { CallProvider } from './context/CallContext';
import './styles/global.css';
import './styles/pages.css';
import './styles/chat.css';
import './styles/shop.css';
import './styles/call.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ChatSocketProvider>
            <CartProvider>
              <FavoritesProvider>
                <CallProvider>
                  <App />
                </CallProvider>
              </FavoritesProvider>
            </CartProvider>
          </ChatSocketProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
