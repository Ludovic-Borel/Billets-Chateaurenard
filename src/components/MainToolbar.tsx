import { ReactNode } from "react";

interface MainToolbarProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function MainToolbar({
  left,
  center,
  right,
}: MainToolbarProps) {
  return (
    <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-2">

        <div className="flex items-center gap-2 min-w-0">
          {left}
        </div>

        <div className="flex items-center justify-center flex-1">
          {center}
        </div>

        <div className="flex items-center gap-2">
          {right}
        </div>

      </div>
    </div>
  );
}