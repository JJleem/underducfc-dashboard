"use client";

import { usePathname, useSearchParams } from "next/navigation";

export default function RouteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  return (
    <div key={routeKey} className="route-enter min-h-full">
      {children}
    </div>
  );
}
