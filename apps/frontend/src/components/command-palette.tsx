'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  BarChart3,
  BookOpen,
  Gauge,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Moon,
  Monitor,
  Plus,
  Sun,
  TicketIcon,
  Users,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useTickets } from '@/hooks/use-tickets';
import { canManageTeam, canViewSlaDashboard } from '@/lib/rbac';
import { useUIStore } from '@/store/ui-store';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: user } = useCurrentUser();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const ticketResults = useTickets({
    search: debouncedSearch || undefined,
    pageSize: 6,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const navItems = useMemo(() => {
    if (!user) return [];
    const items = [
      { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
      { href: '/dashboard/tickets', label: 'Tickets', icon: MessageSquare },
      { href: '/dashboard/knowledge-base', label: 'Knowledge base', icon: BookOpen },
      { href: '/dashboard/sessions', label: 'Sessions', icon: Monitor },
    ];
    if (canViewSlaDashboard(user.role.name)) {
      items.push({ href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 });
      items.push({ href: '/dashboard/sla', label: 'SLA dashboard', icon: Gauge });
    }
    if (canManageTeam(user.role.name)) {
      items.push({ href: '/dashboard/team', label: 'Team', icon: Users });
    }
    return items;
  }, [user]);

  const filteredNavItems = navItems.filter((item) =>
    item.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  if (!user) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput placeholder="Search tickets, jump to a page..." value={search} onValueChange={setSearch} />
      <CommandList>
        {!ticketResults.isLoading && filteredNavItems.length === 0 && !ticketResults.data?.items.length && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {!search.trim() && (
          <CommandGroup heading="Quick actions">
            <CommandItem onSelect={() => go('/dashboard/tickets/new')}>
              <Plus />
              New ticket
            </CommandItem>
            <CommandItem onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun /> : <Moon />}
              Toggle theme
            </CommandItem>
          </CommandGroup>
        )}

        {filteredNavItems.length > 0 && (
          <CommandGroup heading="Navigate">
            {filteredNavItems.map((item) => (
              <CommandItem key={item.href} onSelect={() => go(item.href)}>
                <item.icon />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {debouncedSearch && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tickets">
              {ticketResults.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Searching…
                </div>
              ) : ticketResults.data && ticketResults.data.items.length > 0 ? (
                ticketResults.data.items.map((ticket) => (
                  <CommandItem key={ticket.id} onSelect={() => go(`/dashboard/tickets/${ticket.id}`)}>
                    <TicketIcon />
                    <span className="min-w-0 flex-1 truncate">{ticket.subject}</span>
                    <CommandShortcut>#{ticket.number}</CommandShortcut>
                  </CommandItem>
                ))
              ) : (
                <p className="px-2 py-3 text-sm text-muted-foreground">No tickets match &ldquo;{debouncedSearch}&rdquo;.</p>
              )}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
