import { prisma } from '@/lib/db';
import {
  enrichTargetWithProgress,
  getTargetsWithProgress,
  isSupportedPeriod
} from '@/lib/performance';
import { getSessionWithPermissions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

const parseDate = (value: unknown) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export async function GET(_request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const targets = await getTargetsWithProgress();
    return NextResponse.json({ targets });
  } catch (error) {
    console.error('Error fetching performance targets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (
      !session ||
      (
        !session.user.permissions.MANAGE_PATIENT &&
        !session.user.permissions.CREATE_INVOICE
      )
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      periodType,
      periodStart,
      periodEnd,
      branch,
      team,
      revenueTarget,
      profitTarget,
      notes
    } = body;

    const startDate = parseDate(periodStart);
    const endDate = parseDate(periodEnd);

    if (!isSupportedPeriod(periodType)) {
      return NextResponse.json(
        { error: 'Invalid period type' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Invalid period start/end dates' },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'Period end must be after period start' },
        { status: 400 }
      );
    }

    const revenueTargetValue = Number(revenueTarget ?? 0);
    const profitTargetValue = Number(profitTarget ?? 0);

    if (Number.isNaN(revenueTargetValue) || Number.isNaN(profitTargetValue)) {
      return NextResponse.json(
        { error: 'Targets must be valid numbers' },
        { status: 400 }
      );
    }

    const newTarget = await prisma.performanceTarget.create({
      data: {
        name: name || null,
        periodType,
        periodStart: startDate,
        periodEnd: endDate,
        branch: branch || null,
        team: team || null,
        revenueTarget: revenueTargetValue,
        profitTarget: profitTargetValue,
        notes: notes || null,
        createdBy: session.user.id
      }
    });

    const enriched = await enrichTargetWithProgress(newTarget);

    return NextResponse.json(
      { success: true, target: enriched },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating performance target:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
