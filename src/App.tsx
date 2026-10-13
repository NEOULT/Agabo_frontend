import { BrowserRouter } from 'react-router-dom';
import { RepositoryProvider } from '@/application/providers/RepositoryProvider';
import { AuthInitializer } from '@/application/providers/AuthInitializer';
import { AppRouter } from '@/presentation/routes/AppRouter';

export function App() {
  return (
    <BrowserRouter>
      <RepositoryProvider>
        <AuthInitializer>
          <AppRouter />
        </AuthInitializer>
      </RepositoryProvider>
    </BrowserRouter>
  );
}
