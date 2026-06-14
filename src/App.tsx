import { useState } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { ChatWindow } from './components/ChatWindow';

function App() {
  const [user, setUser] = useState<{ name: string; skinType: string } | null>(null);

  const handleIntroComplete = (name: string, skinType: string) => {
    setUser({ name, skinType });
  };

  const handleReset = () => {
    setUser(null);
  };

  if (!user) {
    return <IntroScreen onComplete={handleIntroComplete} />;
  }

  return <ChatWindow userName={user.name} skinType={user.skinType} onReset={handleReset} />;
}

export default App;
