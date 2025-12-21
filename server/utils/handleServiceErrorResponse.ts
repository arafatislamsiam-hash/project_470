import { isServiceError } from '@/server/services/serviceErrors';
import { NextResponse } from 'next/server';

export function handleServiceErrorResponse(context: string, error: unknown) {
  if (isServiceError(error)) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  console.error(context, error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
