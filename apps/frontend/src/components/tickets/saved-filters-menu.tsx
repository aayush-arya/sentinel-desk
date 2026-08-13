'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Bookmark, Star, Trash2 } from 'lucide-react';
import { useSavedFilters, useCreateSavedFilter, useDeleteSavedFilter } from '@/hooks/use-saved-filters';
import { getApiErrorMessage } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface TicketFilterState {
  status?: string;
  priority?: string;
  assignee?: string;
  search?: string;
}

function hasActiveFilters(filters: TicketFilterState): boolean {
  return Object.values(filters).some((v) => !!v);
}

export function SavedFiltersMenu({
  currentFilters,
  onApply,
}: {
  currentFilters: TicketFilterState;
  onApply: (filters: TicketFilterState) => void;
}) {
  const { data: savedFilters } = useSavedFilters();
  const createSavedFilter = useCreateSavedFilter();
  const deleteSavedFilter = useDeleteSavedFilter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await createSavedFilter.mutateAsync({ name: name.trim(), filters: currentFilters as Record<string, unknown> });
      toast.success('Filter saved');
      setName('');
      setSaving(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save filter'));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Bookmark className="size-3.5" />
          Saved filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        {savedFilters && savedFilters.length > 0 ? (
          <div className="mb-1 space-y-0.5">
            {savedFilters.map((filter) => (
              <div key={filter.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onApply(filter.filters as TicketFilterState);
                    setOpen(false);
                  }}
                  className="flex flex-1 items-center gap-2 truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <Star className="size-3 shrink-0 text-muted-foreground" />
                  {filter.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSavedFilter.mutate(filter.id)}
                  aria-label={`Delete ${filter.name}`}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No saved filters yet</p>
        )}
        <div className="border-t border-border pt-1">
          {saving ? (
            <div className="space-y-1.5 p-1.5">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="Filter name"
                className="h-7 text-sm"
              />
              <Button size="sm" className="h-7 w-full text-xs" onClick={handleSave} disabled={!name.trim()}>
                Save
              </Button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!hasActiveFilters(currentFilters)}
              onClick={() => setSaving(true)}
              className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              Save current filters…
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
