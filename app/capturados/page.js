import { auth } from "@/auth";
import CapturedDex from "@/components/CapturedDex";
import { getCapturedIds, getNationalDexCount } from "@/lib/pokeapi";

export default async function CapturadosPage() {
  const session = await auth();

  const [capturedIds, dexCount] = await Promise.all([
    getCapturedIds(session?.user?.id),
    getNationalDexCount(),
  ]);

  return <CapturedDex capturedIds={capturedIds} dexCount={dexCount} />;
}
