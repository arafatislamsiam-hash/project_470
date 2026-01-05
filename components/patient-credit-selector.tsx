'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type CreditNoteSummary = {
  id: string;
  creditNo: string;
  remainingAmount: number;
  totalAmount: number;
  createdAt?: string;
};

export type AppliedCreditSelection = {
  creditNoteId: string;
  amount: number;
};

export type InitialCreditSelection = {
  creditNoteId: string;
  creditNo: string;
  amount: number;
};

const EMPTY_INITIAL_SELECTIONS: InitialCreditSelection[] = [];

interface PatientCreditSelectorProps {
  patientId: string | null;
  initialSelections?: InitialCreditSelection[];
  onChange: (credits: AppliedCreditSelection[], total: number) => void;
}

export default function PatientCreditSelector({
  patientId,
  initialSelections,
  onChange
}: PatientCreditSelectorProps) {
  const [credits, setCredits] = useState<CreditNoteSummary[]>([]);
  const [creditInputs, setCreditInputs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const appliedCredits = useMemo(() => {
    return Object.entries(creditInputs)
      .filter(([, value]) => value > 0)
      .map(([creditNoteId, amount]) => ({
        creditNoteId,
        amount: Number(amount.toFixed(2))
      }));
  }, [creditInputs]);

  const appliedTotal = useMemo(
    () => appliedCredits.reduce((sum, credit) => sum + credit.amount, 0),
    [appliedCredits]
  );

  const normalizedInitialSelections = useMemo(
    () => initialSelections ?? EMPTY_INITIAL_SELECTIONS,
    [initialSelections]
  );
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const upsertCredits = useCallback(
    (fetchedCredits: CreditNoteSummary[]) => {
      if (!normalizedInitialSelections.length) {
        setCredits(fetchedCredits);
        return;
      }

      const mapped = [...fetchedCredits];
      normalizedInitialSelections.forEach((selection) => {
        const existing = mapped.find((credit) => credit.id === selection.creditNoteId);
        if (!existing) {
          mapped.push({
            id: selection.creditNoteId,
            creditNo: selection.creditNo,
            remainingAmount: Math.max(selection.amount, 0),
            totalAmount: Math.max(selection.amount, 0)
          });
        }
      });
      setCredits(mapped);
    },
    [normalizedInitialSelections]
  );

  useEffect(() => {
    onChangeRef.current(appliedCredits, appliedTotal);
  }, [appliedCredits, appliedTotal]);

  useEffect(() => {
    setCreditInputs((prev) => {
      const next = { ...prev };
      normalizedInitialSelections.forEach((selection) => {
        if (next[selection.creditNoteId] === undefined) {
          next[selection.creditNoteId] = selection.amount;
        }
      });
      return next;
    });
  }, [normalizedInitialSelections]);

  useEffect(() => {
    let cancelled = false;

    const fetchCredits = async () => {
      if (!patientId) {
        setCredits([]);
        setCreditInputs({});
        setError('');
        onChangeRef.current([], 0);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const response = await fetch(
          `/api/credit-notes?patientId=${encodeURIComponent(patientId)}&status=open&limit=50`
        );
        if (!response.ok) {
          throw new Error('Failed to load credits');
        }
        const data = await response.json();
        if (cancelled) {
          return;
        }

        const normalized: CreditNoteSummary[] = (data.creditNotes ?? []).map(
          (note: {
            id: string;
            creditNo: string;
            remainingAmount: number | string;
            totalAmount: number | string;
            createdAt?: string;
          }) => ({
            id: note.id,
            creditNo: note.creditNo,
            remainingAmount: Number(note.remainingAmount ?? 0),
            totalAmount: Number(note.totalAmount ?? 0),
            createdAt: note.createdAt
          })
        );
        upsertCredits(normalized);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('Unable to load available credits for this patient.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCredits();
    return () => {
      cancelled = true;
    };
  }, [patientId, upsertCredits]);

  const handleAmountChange = (creditId: string, value: string) => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue) || numericValue < 0) {
      return;
    }

    const creditMeta = credits.find((credit) => credit.id === creditId);
    if (!creditMeta) {
      return;
    }

    const clampedValue = Math.min(numericValue, creditMeta.remainingAmount);
    setCreditInputs((prev) => ({
      ...prev,
      [creditId]: clampedValue
    }));
  };

  if (!patientId) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500">
        Select a patient to view available credits.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Patient Credits</h4>
          <p className="text-xs text-gray-500">
            Apply credit notes to reduce the outstanding balance. Leave fields empty to skip.
          </p>
        </div>
        {loading && <span className="text-xs text-gray-500">Loading…</span>}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}

      {credits.length === 0 && !loading ? (
        <p className="mt-3 text-sm text-gray-500">No open credits found for this patient.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {credits.map((credit) => (
            <div
              key={credit.id}
              className="flex flex-col gap-2 rounded-md border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{credit.creditNo}</p>
                <p className="text-xs text-gray-500">
                  Remaining balance: ৳{credit.remainingAmount.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={`credit-${credit.id}`} className="text-xs text-gray-500">
                  Apply
                </label>
                <input
                  id={`credit-${credit.id}`}
                  type="number"
                  min={0}
                  step="0.01"
                  max={credit.remainingAmount}
                  value={creditInputs[credit.id] ?? ''}
                  onChange={(event) => handleAmountChange(credit.id, event.target.value)}
                  className="w-32 rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {appliedTotal > 0 && (
        <p className="mt-4 text-sm text-blue-700">
          Applying ৳{appliedTotal.toFixed(2)} in credits.
        </p>
      )}
    </div>
  );
}
