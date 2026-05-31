'use client';
import { useSettingsAuth } from '@/hooks/useSettingsAuth';
import { PinGate } from '@/components/settings/PinGate';

export default function SettingsLayout({ children }) {
  const { authenticated, hasPin, verify } = useSettingsAuth();
  if (!authenticated) return <PinGate onVerify={verify} />;
  return <>{children}</>;
}
