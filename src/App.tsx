import { TooltipProvider } from '@/components/ui/tooltip'
import { DesignSystemPage } from '@/demo/design-system-page'

function App() {
  return (
    <TooltipProvider delayDuration={400}>
      <DesignSystemPage />
    </TooltipProvider>
  )
}

export default App
