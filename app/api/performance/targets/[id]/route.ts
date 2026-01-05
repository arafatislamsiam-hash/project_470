import { NextRequest } from 'next/server';
import {
  deletePerformanceTarget,
  updatePerformanceTarget
} from '@/server/controllers/performanceController';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, ctx: RouteParams) {
  return updatePerformanceTarget(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: RouteParams) {
  return deletePerformanceTarget(request, ctx);
}
