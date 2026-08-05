'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Tag as TagIcon, UserRound, X } from 'lucide-react';
import type { TicketDetail, TicketPriority, TicketStatus } from '@sentinel-desk/types';
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@sentinel-desk/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { TicketPriorityBadge, TicketStatusBadge } from './ticket-badges';
import { useAssignableAgents } from '@/hooks/use-agents';
import { useTags } from '@/hooks/use-tags';
import { useAssignTicket, useUpdateTicket, useTicketTags } from '@/hooks/use-tickets';
import { getApiErrorMessage } from '@/lib/api-client';

const STATUS_VALUES: TicketStatus[] = ['OPEN', 'PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'];
const PRIORITY_VALUES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function TicketSidebar({ ticket, isStaff }: { ticket: TicketDetail; isStaff: boolean }) {
  const updateTicket = useUpdateTicket(ticket.id);
  const assignTicket = useAssignTicket(ticket.id);
  const { add: addTag, remove: removeTag } = useTicketTags(ticket.id);
  const { data: agents } = useAssignableAgents();
  const { data: allTags } = useTags();
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  const handleError = (error: unknown, fallback: string) => toast.error(getApiErrorMessage(error, fallback));

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Status</p>
        {isStaff ? (
          <Select
            value={ticket.status}
            onValueChange={(v) =>
              updateTicket.mutate({ status: v as TicketStatus }, { onError: (e) => handleError(e, 'Unable to update status') })
            }
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TICKET_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <TicketStatusBadge status={ticket.status} />
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Priority</p>
        {isStaff ? (
          <Select
            value={ticket.priority}
            onValueChange={(v) =>
              updateTicket.mutate({ priority: v as TicketPriority }, { onError: (e) => handleError(e, 'Unable to update priority') })
            }
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_VALUES.map((p) => (
                <SelectItem key={p} value={p}>
                  {TICKET_PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <TicketPriorityBadge priority={ticket.priority} />
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Assignee</p>
        {isStaff ? (
          <Select
            value={ticket.assignee?.id ?? 'unassigned'}
            onValueChange={(v) => {
              if (v === 'unassigned') return;
              assignTicket.mutate(v, { onError: (e) => handleError(e, 'Unable to assign ticket') });
            }}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {!ticket.assignee && <SelectItem value="unassigned">Unassigned</SelectItem>}
              {agents?.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.firstName} {agent.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            {ticket.assignee ? (
              <>
                <Avatar className="size-5">
                  <AvatarFallback className="text-[9px]">
                    {ticket.assignee.firstName[0]}
                    {ticket.assignee.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                {ticket.assignee.firstName} {ticket.assignee.lastName}
              </>
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Tags</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {ticket.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${tag.color}1a`, color: tag.color }}
            >
              {tag.name}
              {isStaff && (
                <button
                  type="button"
                  onClick={() =>
                    removeTag.mutate(tag.id, { onError: (e) => handleError(e, 'Unable to remove tag') })
                  }
                  aria-label={`Remove ${tag.name}`}
                >
                  <X className="size-2.5" />
                </button>
              )}
            </span>
          ))}
          {isStaff && (
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-xs">
                  <TagIcon className="size-3" />
                  Add
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="start">
                {allTags
                  ?.filter((t) => !ticket.tags.some((existing) => existing.id === t.id))
                  .map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        addTag.mutate(tag.id, { onError: (e) => handleError(e, 'Unable to add tag') });
                        setTagPopoverOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <span className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </button>
                  ))}
                {allTags?.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">No tags yet</p>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Requester</p>
        <div className="flex items-center gap-2 text-sm">
          <Avatar className="size-5">
            <AvatarFallback className="text-[9px]">
              {ticket.requester.firstName[0]}
              {ticket.requester.lastName[0]}
            </AvatarFallback>
          </Avatar>
          {ticket.requester.firstName} {ticket.requester.lastName}
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <UserRound className="size-3" />
          {ticket.requester.email}
        </p>
      </div>

      {(ticket.mergedInto || ticket.splitFrom) && (
        <div className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
          {ticket.mergedInto && <p>Merged into #{ticket.mergedInto.number}</p>}
          {ticket.splitFrom && <p>Split from #{ticket.splitFrom.number}</p>}
        </div>
      )}
    </div>
  );
}
