"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me = { id: string; name: string; email: string; role: string };

/** Guard sisi client: redirect ke /login bila belum login sebagai TENANT. */
export function useTenantGuard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { user: Me | null }) => {
        if (!data.user || data.user.role !== "TENANT") {
          router.replace("/login");
          return;
        }
        setMe(data.user);
      })
      .finally(() => setChecking(false));
  }, [router]);

  return { me, checking };
}
