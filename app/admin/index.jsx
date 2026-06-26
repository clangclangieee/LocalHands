// FILE: app/admin/index.jsx
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function AdminIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, []);

  return null;
}