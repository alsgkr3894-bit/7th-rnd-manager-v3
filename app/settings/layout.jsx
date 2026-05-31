'use client';
import { useRouter } from 'next/navigation';
import { useSettingsAuth } from '@/hooks/useSettingsAuth';
import { PinGate } from '@/components/settings/PinGate';

export default function SettingsLayout({ children }) {
  const router = useRouter();
  const { authenticated, hasPin, verify } = useSettingsAuth();
  if (!authenticated) return <PinGate onVerify={verify} onCancel={() => router.push('/')} />;
  return <>{children}</>;
}
