import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isAuthenticated } from "@/lib/store";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddPrefect from "./pages/AddPrefect";
import DutyRecords from "./pages/DutyRecords";
import Leaderboard from "./pages/Leaderboard";
import Performance from "./pages/Performance";
import Promotion from "./pages/Promotion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [authed, setAuthed] = useState(isAuthenticated());

  if (!authed) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <Login onLogin={() => setAuthed(true)} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AppLayout onLogout={() => setAuthed(false)}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add-prefect" element={<AddPrefect />} />
              <Route path="/duties" element={<DutyRecords />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/promotion" element={<Promotion />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
