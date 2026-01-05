import { NextRequest } from 'next/server';
import { applyCreditNote } from '@/server/controllers/creditNoteController';

export async function POST(request: NextRequest) {
  return applyCreditNote(request);
}
