import { NextRequest } from 'next/server';
import { createCreditNote, listCreditNotes } from '@/server/controllers/creditNoteController';

export async function GET(request: NextRequest) {
  return listCreditNotes(request);
}

export async function POST(request: NextRequest) {
  return createCreditNote(request);
}
