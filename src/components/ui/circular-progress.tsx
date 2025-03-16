import * as React from "react";
import { cn } from "@/lib/utils";

export interface CircularProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = (value / max) * 100;
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center",
          className
        )}
        {...props}
      >
        <svg
          className="transform -rotate-90"
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="text-muted stroke-current"
            strokeWidth="8"
            fill="transparent"
            r={radius}
            cx="50"
            cy="50"
            strokeOpacity={0.2}
          />
          <circle
            className="text-primary stroke-current transition-all duration-200 ease-in-out"
            strokeWidth="8"
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx="50"
            cy="50"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>
      </div>
    );
  }
);

CircularProgress.displayName = "CircularProgress";

export { CircularProgress };
