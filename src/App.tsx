import { useState } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { ChatWindow } from './components/ChatWindow';
import { AdminDashboard } from './components/AdminDashboard';

function App() {
  const [view, setView] = useState<'intro' | 'chat' | 'admin'>('intro');
  const [user, setUser] = useState<{ name: string; skinType: string } | null>(null);

  const handleIntroComplete = (name: string, skinType: string) => {
    setUser({ name, skinType });
    setView('chat');
  };

  const handleReset = () => {
    setUser(null);
    setView('intro');
  };

  const handleGoToAdmin = () => {
    setView('admin');
  };

  const handleBackToChat = () => {
    setView(user ? 'chat' : 'intro');
  };

  if (view === 'admin') {
    return <AdminDashboard onBackToChat={handleBackToChat} />;
  }

  if (view === 'intro' || !user) {
    return (
      <IntroScreen
        onComplete={handleIntroComplete}
        onGoToAdmin={handleGoToAdmin}
      />
    );
  }

  return (
    <ChatWindow
      userName={user.name}
      skinType={user.skinType}
      onReset={handleReset}
      onGoToAdmin={handleGoToAdmin}
    />
  );
}

export default App;
