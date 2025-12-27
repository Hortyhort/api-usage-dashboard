import type { AppProps } from 'next/app';
import { ToastProvider } from '../components/ui/ToastProvider';
import { ThemeProvider } from '../lib/ThemeContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </ThemeProvider>
  );
}
