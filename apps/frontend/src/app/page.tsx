import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  MessageSquareText,
  ShieldCheck,
  Timer,
  Users,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FEATURES = [
  {
    icon: Timer,
    title: 'SLA engine that actually enforces itself',
    description:
      'Business hours, holiday calendars, and automatic escalation keep response and resolution targets honest — no spreadsheets required.',
  },
  {
    icon: MessageSquareText,
    title: 'A ticket workflow built for teams',
    description:
      'Assign, transfer, merge, split, and escalate tickets with full history and internal notes agents can trust.',
  },
  {
    icon: Bot,
    title: 'AI where it actually helps',
    description:
      'Summarization, suggested replies, sentiment and priority signals, and duplicate detection — reviewed by your team, not replacing it.',
  },
  {
    icon: ShieldCheck,
    title: 'Real role-based access',
    description:
      'Customers, agents, senior agents, managers, and admins each see exactly what they should — enforced end to end.',
  },
  {
    icon: BarChart3,
    title: 'Metrics your managers will trust',
    description:
      'Response time, resolution time, CSAT, and SLA compliance broken down by day, week, and month.',
  },
  {
    icon: Users,
    title: 'Built for the whole organization',
    description:
      'Multi-tenant from day one, with audit logs and session management that hold up to a security review.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border/60 px-6">
        <BrandLogo />
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <section className="relative overflow-hidden px-6 py-24 md:py-32">
        <div className="animated-mesh-bg pointer-events-none absolute inset-0 -z-10" />
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Enterprise-ready support desk
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            Customer support that
            <span className="brand-gradient-text"> never misses an SLA</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            SentinelDesk is the ticketing and SLA desk built for teams who are tired of finding out
            about a breach after it happens.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start for free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Everything a support team needs, nothing it doesn&apos;t
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="border-border/60">
                <CardHeader>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-4.5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-border/60 px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <BrandLogo className="opacity-80" />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} SentinelDesk</p>
        </div>
      </footer>
    </div>
  );
}
