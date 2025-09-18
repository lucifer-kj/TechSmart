"use client";

import { RealtimeConnectionStatus } from "@/hooks/useRealtime";

type Props = {
  status: RealtimeConnectionStatus;
  label?: string;
  className?: string;
};

export function RealtimeStatusIndicator({ status, label = "Live", className = "" }: Props) {
  const color =
    status === "connected" ? "bg-green-500" : status === "connecting" ? "bg-yellow-500" : "bg-red-500";

  const text = status === "connected" ? label : status === "connecting" ? "Connecting" : "Offline";

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-gray-500">{text}</span>
    </div>
  );
}


