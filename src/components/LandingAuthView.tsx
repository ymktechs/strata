import React, { useState } from 'react';
import { ArrowRight, Check, Hash, Lock, MessageSquare, Shield, Users } from 'lucide-react';

interface LandingAuthViewProps {
  onSignIn: () => Promise<void>;
  isSigningIn: boolean;
  authError: string | null;
}

export const LandingAuthView: React.FC<LandingAuthViewProps> = ({
  onSignIn,
  isSigningIn,
  authError,
}) => {
  const [activeSection, setActiveSection] = useState<'architecture' | 'security' | 'directory'>(
    'architecture'
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <a href="#top" className="text-lg font-bold tracking-tight text-slate-900">
          Strata
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#workflow"
            onClick={() => setActiveSection('architecture')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            Architecture
          </a>
          <a
            href="#workflow"
            onClick={() => setActiveSection('security')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            Access Control
          </a>
          <a
            href="#workflow"
            onClick={() => setActiveSection('directory')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            Member Directory
          </a>
          <a
            href="#onboarding-steps"
            className="hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            Workspaces
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSignIn}
            disabled={isSigningIn}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
          >
            {isSigningIn ? 'Connecting Account...' : 'Create Account / Sign In'}
          </button>
        </div>
      </header>

      {/* Main Content Container (1440px Baseline) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-14 space-y-16">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Enterprise Organization Communication</span>
              <span aria-hidden="true">·</span>
              <span>Role-Gated Channels</span>
              <span aria-hidden="true">·</span>
              <span>Real-Time Sync</span>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Structured real-time chat built for your entire organization.
            </h1>

            <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
              Create your member account, launch an organization workspace or join colleagues with
              an invite code, and collaborate across department channels and private direct
              messages with strict membership isolation.
            </p>

            {authError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {authError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>{isSigningIn ? 'Signing In...' : 'Continue with Google Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#onboarding-steps"
                className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                See how organization onboarding works
              </a>
            </div>

            <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-6 text-xs text-slate-600">
              <div>
                <div className="font-mono font-semibold text-base text-slate-900 tabular-nums">
                  100%
                </div>
                <div className="mt-0.5">Membership-gated channel reads & writes</div>
              </div>
              <div>
                <div className="font-mono font-semibold text-base text-slate-900 tabular-nums">
                  Multi-Org
                </div>
                <div className="mt-0.5">Switch between multiple organization workspaces</div>
              </div>
              <div>
                <div className="font-mono font-semibold text-base text-slate-900 tabular-nums">
                  1:1 DMs
                </div>
                <div className="mt-0.5">Participant-isolated private direct messaging</div>
              </div>
            </div>
          </div>

          {/* Live Workspace Preview Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between text-xs">
              <span className="font-semibold">Aether Systems · Workspace Preview</span>
              <span className="font-mono text-slate-300 tabular-nums">Invite: AETHER-2026</span>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  <span>engineering-ops</span>
                </div>
                <span className="font-mono tabular-nums">24 members · Active</span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-semibold flex items-center justify-center shrink-0">
                    EV
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">Elena Vance</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">VP Engineering</span>
                      <span className="font-mono text-slate-400 tabular-nums ml-auto">09:42</span>
                    </div>
                    <p className="mt-1 text-slate-700 leading-relaxed">
                      Welcome to the new engineers joining today. Grab the workspace invite code from
                      the top bar if your team members are creating their accounts now.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-semibold flex items-center justify-center shrink-0">
                    MK
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">Marcus K.</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">Platform Lead</span>
                      <span className="font-mono text-slate-400 tabular-nums ml-auto">09:44</span>
                    </div>
                    <p className="mt-1 text-slate-700 leading-relaxed">
                      All release notes are pinned in #announcements. Ping me via Direct Message if
                      you need staging credentials.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Sign in to create your profile and start chatting</span>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Open Workspace →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Mechanism-to-Outcome Interactive Tabs */}
        <section id="workflow" className="pt-8 border-t border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                How Strata Protects & Connects Your Organization
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Every workspace enforces strict attribute-based access control from account creation
                to message delivery.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setActiveSection('architecture')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeSection === 'architecture'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Channel Architecture
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('security')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeSection === 'security'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Zero-Trust Rules
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('directory')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeSection === 'directory'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Member Directory
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            {activeSection === 'architecture' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-xs font-mono text-indigo-600 font-semibold">
                    01. USER GOAL
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Organize discussions by department and topic
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Keep company announcements, engineering coordination, product planning, and 1:1
                    conversations cleanly separated instead of buried in a single feed.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-mono text-indigo-600 font-semibold">
                    02. INTERFACE MECHANISM
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Categorized channels, message pinning, and quoted replies
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Every workspace provisions #announcements, #general, and #engineering-ops
                    automatically, and members can create new department channels or pin key
                    decisions.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-mono text-indigo-600 font-semibold">
                    03. MEASURABLE OUTCOME
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Instant real-time sync across all signed-in teammates
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    New messages, edits, pins, and presence changes appear live via Firestore
                    document streams without manual page refreshes.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-xs font-mono text-indigo-600 font-semibold">
                    01. USER GOAL
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Ensure only verified organization members access internal chats
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Prevent external users from reading organization channels and keep personal email
                    addresses isolated from public member profiles.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-mono text-indigo-600 font-semibold">
                    02. INTERFACE MECHANISM
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Master Gate membership verification & PII vault isolation
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Every channel and message read verifies active membership in the parent
                    organization, while Direct Messages restrict access strictly to the two
                    participants.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-mono text-indigo-600 font-semibold">
                    03. MEASURABLE OUTCOME
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Zero cross-organization data leakage
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Users can belong to multiple organizations and switch contexts seamlessly while
                    each workspace remains hermetically isolated.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'directory' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-xs font-mono text-indigo-600 font-semibold">
                    01. USER GOAL
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Find anyone in the organization by role or department
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    New hires and cross-functional teams need to see who is online, what role they
                    hold, and message them directly.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-mono text-indigo-600 font-semibold">
                    02. INTERFACE MECHANISM
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Live Member Directory with presence & 1-click Direct Messaging
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Filter the organization directory by department or search by name, inspect live
                    availability, and launch a private 1:1 thread with one click.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-mono text-indigo-600 font-semibold">
                    03. MEASURABLE OUTCOME
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Frictionless onboarding for growing teams
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Every member who joins with your organization invite code is automatically
                    indexed in the directory with their title and department.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3-Step Onboarding Overview */}
        <section id="onboarding-steps" className="pt-8 border-t border-slate-200 space-y-6">
          <h2 className="text-xl font-bold text-slate-900">
            Three Steps from Account Creation to Team Chat
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                01. Create Your Member Account
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Authenticate with Google and configure your workspace profile—display name, job
                title, department, and availability status.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                02. Create or Join an Organization
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Launch a new organization workspace to get a shareable invite code, or enter an
                existing invite code from your team to join their workspace immediately.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                03. Collaborate in Channels & DMs
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Post updates in department channels, reply with quoted context, pin critical
                messages, and message colleagues privately in 1:1 threads.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>Strata Organization Workspace · Built with Firebase Auth & Firestore</span>
          <button
            type="button"
            onClick={onSignIn}
            className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            Sign in to access your organization →
          </button>
        </div>
      </footer>
    </div>
  );
};
