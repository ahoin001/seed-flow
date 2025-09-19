import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProductFlow from "./pages/ProductFlow";
import ItemLookupPage from "./pages/ItemLookupPage";
import DuplicatesPage from "./pages/DuplicatesPage";
import AmazonFlow from "./pages/AmazonFlow";
import ParserTester from "./pages/ParserTester";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      <TooltipProvider>
        <Toaster position="top-right" />
        <Sonner position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ProductFlow />} />
            <Route path="/lookup" element={<ItemLookupPage />} />
            <Route path="/duplicates" element={<DuplicatesPage />} />
            <Route path="/amazon-flow" element={<AmazonFlow />} />
            <Route path="/parser-tester" element={<ParserTester />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
