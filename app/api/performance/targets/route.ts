import { NextRequest } from 'next/server';
import { createPerformanceTarget, listPerformanceTargets } from '@/server/controllers/performanceController';

export async function GET() {
  return listPerformanceTargets();
}

export async function POST(request: NextRequest) {
  return createPerformanceTarget(request);
}
