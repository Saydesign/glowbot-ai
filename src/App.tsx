import { useState, useEffect } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { ChatWindow } from './components/ChatWindow';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './components/Toast';

function App() {
  const [view, setView] = useState<'intro' | 'chat' | 'admin'>('intro');
  const [user, setUser] = useState<{ name: string; skinType: string } | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Route-based admin access
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setView('admin');
      const session = localStorage.getItem('glowbot_admin_session');
      setIsAdminLoggedIn(session === 'true');
    }
    const handlePop = () => {
      if (window.location.pathname === '/admin') {
        setView('admin');
        const session = localStorage.getItem('glowbot_admin_session');
        setIsAdminLoggedIn(session === 'true');
      } else {
        setView(user ? 'chat' : 'intro');
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [user]);

  const handleIntroComplete = (name: string, skinType: string) => {
    setUser({ name, skinType });
    setView('chat');
    window.history.pushState({}, '', '/');
  };

  const handleReset = () => {
    setUser(null);
    setView('intro');
    window.history.pushState({}, '', '/');
  };

  const handleBackToChat = () => {
    setView(user ? 'chat' : 'intro');
    window.history.pushState({}, '', '/');
  };

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('glowbot_admin_session');
    setIsAdminLoggedIn(false);
  };

  if (view === 'admin') {
    if (!isAdminLoggedIn) {
      return <AdminLogin onLogin={handleAdminLogin} />;
    }
    return (
      <ToastProvider>
        <AdminDashboard onBackToChat={handleBackToChat} onLogout={handleAdminLogout} />
      </ToastProvider>
    );
  }

  if (view === 'intro' || !user) {
    return <IntroScreen onComplete={handleIntroComplete} />;
  }

  return (
    <CartProvider>
      <ChatWindow userName={user.name} skinType={user.skinType} onReset={handleReset} />
    </CartProvider>
  );
}

export default App;