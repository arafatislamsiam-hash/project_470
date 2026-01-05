'use client';

import Navigation from '@/components/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface AppointmentRecord {
  id: string;
  appointmentDate: string;
  status: string;
  reason?: string | null;
  notes?: string | null;
  branch?: string | null;
  patient: {
    id: string;
    patientName: string;
    patientMobile: string;
  };
  invoice?: {
    id: string;
    invoiceNo: string;
    totalAmount?: number;
  } | null;
}

interface PatientResult {
  id: string;
  patientName: string;
  patientMobile: string;
}

const STATUS_FILTERS = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'All', value: 'all' }
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]['value'];

export default function AppointmentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const permissions = session?.user.permissions;
  const canManageAppointments = Boolean(permissions?.MANAGE_PATIENT || permissions?.CREATE_INVOICE);

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming');
  const [showModal, setShowModal] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [appointmentBranch, setAppointmentBranch] = useState('');
  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAppointments = useCallback(async (filter: StatusFilter) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter === 'upcoming') {
        params.set('status', 'scheduled');
        params.set('upcoming', 'true');
      } else if (filter === 'completed') {
        params.set('status', 'completed');
      } else if (filter === 'cancelled') {
        params.set('status', 'cancelled');
      }

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/appointments${query}`);
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      } else {
        setError('Failed to load appointments.');
        setAppointments([]);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Unable to load appointments.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!canManageAppointments) {
      router.push('/dashboard');
      return;
    }
    fetchAppointments(statusFilter);
  }, [session, status, router, canManageAppointments, statusFilter, fetchAppointments]);

  const handlePatientSearch = async () => {
    if (!patientSearchTerm.trim()) {
      return;
    }
    try {
      const response = await fetch(`/api/patient?search=${encodeURIComponent(patientSearchTerm.trim())}`);
      if (response.ok) {
        const data = await response.json();
        setPatientResults(data.patients || []);
      } else {
        setPatientResults([]);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatientResults([]);
    }
  };

  const resetModalState = () => {
    setSelectedPatient(null);
    setPatientResults([]);
    setPatientSearchTerm('');
    setAppointmentDate('');
    setAppointmentReason('');
    setAppointmentNotes('');
    setAppointmentBranch('');
    setFormError('');
  };

  const handleCreateAppointment = async () => {
    if (!selectedPatient) {
      setFormError('Please select a patient for this appointment.');
      return;
    }
    if (!appointmentDate) {
      setFormError('Please choose an appointment date and time.');
      return;
    }

    setFormError('');
    setActionLoading(true);
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          appointmentDate,
          reason: appointmentReason,
          notes: appointmentNotes,
          branch: appointmentBranch
        })
      });

      if (response.ok) {
        setShowModal(false);
        resetModalState();
        fetchAppointments(statusFilter);
      } else {
        const data = await response.json();
        setFormError(data.error || 'Failed to create appointment.');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      setFormError('Something went wrong. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchAppointments(statusFilter);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update appointment status');
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Unable to update appointment. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) {
      return;
    }
    setActionLoading(true);
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchAppointments(statusFilter);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete appointment.');
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Unable to delete appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const upcomingCount = useMemo(
    () => appointments.filter((appt) => appt.status === 'scheduled').length,
    [appointments]
  );

  const completedCount = useMemo(
    () => appointments.filter((appt) => appt.status === 'completed').length,
    [appointments]
  );

  const cancelledCount = useMemo(
    () => appointments.filter((appt) => appt.status === 'cancelled').length,
    [appointments]
  );

  if (status === 'loading' || !session || !canManageAppointments) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

  const statusBadgeClasses: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
              <p className="text-sm text-gray-500">
                Keep patient schedules aligned with invoice creation.
              </p>
            </div>
            <button
              onClick={() => {
                resetModalState();
                setShowModal(true);
              }}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Schedule Appointment
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Scheduled</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{upcomingCount}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{completedCount}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Cancelled</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{cancelledCount}</p>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="border-b border-gray-200 px-4 py-5 flex flex-wrap gap-3">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${statusFilter === filter.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading appointments...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-600">{error}</div>
            ) : appointments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No appointments match the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(appointment.appointmentDate)}
                          {appointment.branch && (
                            <div className="text-xs text-gray-500">{appointment.branch}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{appointment.patient.patientName}</div>
                          <div className="text-xs text-gray-500">{appointment.patient.patientMobile}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {appointment.reason || '—'}
                          {appointment.notes && (
                            <div className="text-xs text-gray-500 mt-1">{appointment.notes}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClasses[appointment.status] || 'bg-gray-100 text-gray-800'
                              }`}
                          >
                            {appointment.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {appointment.invoice ? (
                            <Link
                              href={`/invoices/${appointment.invoice.id}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              #{appointment.invoice.invoiceNo}
                            </Link>
                          ) : (
                            <span className="text-gray-400">Not linked</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          {appointment.status === 'scheduled' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(appointment.id, 'completed')}
                                className="text-green-600 hover:text-green-800"
                                disabled={actionLoading}
                              >
                                Mark Completed
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(appointment.id, 'cancelled')}
                                className="text-yellow-600 hover:text-yellow-800"
                                disabled={actionLoading}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {!appointment.invoice && (
                            <button
                              onClick={() => handleDeleteAppointment(appointment.id)}
                              className="text-red-600 hover:text-red-800"
                              disabled={actionLoading}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Schedule Appointment</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetModalState();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Search Patient
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={patientSearchTerm}
                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                    className="flex-1 rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Name or mobile number"
                  />
                  <button
                    type="button"
                    onClick={handlePatientSearch}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    Search
                  </button>
                </div>
                {patientResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                    {patientResults.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        className={`w-full px-3 py-2 text-left text-sm ${selectedPatient?.id === patient.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                          }`}
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <div className="font-medium">{patient.patientName}</div>
                        <div className="text-xs text-gray-500">{patient.patientMobile}</div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedPatient && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">{selectedPatient.patientName}</p>
                    <p className="text-xs text-blue-700">{selectedPatient.patientMobile}</p>
                    <button
                      type="button"
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                      onClick={() => setSelectedPatient(null)}
                    >
                      Deselect
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Appointment Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reason
                </label>
                <input
                  type="text"
                  value={appointmentReason}
                  onChange={(e) => setAppointmentReason(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Consultation purpose"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Branch (Optional)
                </label>
                <input
                  type="text"
                  value={appointmentBranch}
                  onChange={(e) => setAppointmentBranch(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Clinic location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Additional instructions"
                />
              </div>

              {formError && (
                <div className="text-sm text-red-600">
                  {formError}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetModalState();
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAppointment}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : 'Save Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
