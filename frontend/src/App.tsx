import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { TooltipProvider } from './components/ui/tooltip';

function App() {
  return (
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  );
}

export default App;