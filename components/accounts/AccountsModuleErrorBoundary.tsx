"use client";

import React from "react";
import { Button } from "@/components/ui/button";

type Props = { children: React.ReactNode };

type State = { error: Error | null };

/** Catches render errors in Accounts page content without breaking the sidebar shell. */
export class AccountsModuleErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 min-h-[240px] p-6 text-center">
          <p className="text-sm font-semibold text-foreground">Unable to load this module</p>
          <p className="text-xs text-muted-foreground max-w-md">{this.state.error.message}</p>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
