import { Outfit } from 'next/font/google';
import './globals.css';
import { GameProvider } from '@/context/GameContext';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata = {
  title: 'RPS Arena — Multiplayer Rock Paper Scissors',
  description:
    'Play Rock Paper Scissors online with friends! Multiplayer rooms, real-time battles, live chat, and leaderboards.',
  keywords: 'rock paper scissors, multiplayer, online game, RPS, battle',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable}>
      <head>
        <meta name="theme-color" content="#0f0a1e" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
