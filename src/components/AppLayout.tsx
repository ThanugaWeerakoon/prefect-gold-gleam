import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UserPlus, ClipboardList, Trophy, BarChart3, ArrowUpCircle } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/add-prefect', label: 'Add Prefect', icon: UserPlus },
  { to: '/duties', label: 'Duties', icon: ClipboardList },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/performance', label: 'Performance', icon: BarChart3 },
  { to: '/promotion', label: 'Promotion', icon: ArrowUpCircle },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Trophy className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold tracking-tight text-foreground leading-none">ACPG</h1>
              <p className="text-[11px] text-muted-foreground tracking-wider uppercase">Points System</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  pathname === to
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="flex justify-around py-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors ${
                pathname === to ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="container pb-24 md:pb-12 pt-8">
        {children}
      </main>
    </div>
  );
}
