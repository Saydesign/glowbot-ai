import { useState, useEffect } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { ChatWindow } from './components/ChatWindow';
import { AdminDashboard } from './components/AdminDashboard';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './components/Toast';

function App() {
  const [view, setView] = useState<'intro' | 'chat' | 'admin'>('intro');
  const [user, setUser] = useState<{ name: string; skinType: string } | null>(null);

  // Route-based admin access
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setView('admin');
    }
    const handlePop = () => {
      if (window.location.pathname === '/admin') setView('admin');
      else setView(user ? 'chat' : 'intro');
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

  if (view === 'admin') {
    return (
      <ToastProvider>
        <AdminDashboard onBackToChat={handleBackToChat} />
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
