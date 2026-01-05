'use client';

import Navigation from '@/components/navigation';
import PatientCreditSelector, { AppliedCreditSelection } from '@/components/patient-credit-selector';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Product {
  id: string;
  name: string;
  price: number | string;
  category: {
    id: string;
    title: string;
  };
  stockQuantity: number;
  lowStockThreshold: number;
}

interface Patient {
  id: string;
  patientName: string;
  patientMobile: string;
}

interface AppointmentSummary {
  id: string;
  appointmentDate: string;
  status: string;
  reason?: string | null;
  branch?: string | null;
}

interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  discountAmount: number;
  total: number;
  isManual: boolean;
}

export default function CreateInvoicePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSelectionMode, setPatientSelectionMode] = useState<'none' | 'new' | 'existing'>('none');
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [newPatientForm, setNewPatientForm] = useState({ patientName: '', patientMobile: '' });
  const [products, setProducts] = useState<Product[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: 'percentage',
      discountAmount: 0,
      total: 0,
      isManual: false
    }
  ]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [branch, setBranch] = useState<string>('');
  const [corporateId, setCorporateId] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
  const [filteredProducts, setFilteredProducts] = useState<{ [key: string]: Product[] }>({});
  const [showDropdowns, setShowDropdowns] = useState<{ [key: string]: boolean }>({});
  const searchRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [patientAppointments, setPatientAppointments] = useState<AppointmentSummary[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [appliedCredits, setAppliedCredits] = useState<AppliedCreditSelection[]>([]);
  const [appliedCreditTotal, setAppliedCreditTotal] = useState(0);
  const selectedPatientId = selectedPatient?.id || '';
  const getProductById = useCallback((productId: string) => products.find(product => product.id === productId), [products]);

  const getAllocatedQuantity = useCallback((productId: string, excludeItemId?: string) => {
    return invoiceItems.reduce((total, item) => {
      if (item.productId === productId && item.id !== excludeItemId) {
        return total + item.quantity;
      }
      return total;
    }, 0);
  }, [invoiceItems]);

  const getRemainingStock = useCallback((productId: string, currentItemId: string) => {
    const product = getProductById(productId);
    if (!product) {
      return 0;
    }
    const allocatedElsewhere = getAllocatedQuantity(productId, currentItemId);
    return Math.max(0, product.stockQuantity - allocatedElsewhere);
  }, [getAllocatedQuantity, getProductById]);

  const isProductLowStock = useCallback((product: Product) => (
    product.lowStockThreshold > 0 && product.stockQuantity <= product.lowStockThreshold
  ), []);

  const isProductOutOfStock = useCallback((product: Product) => product.stockQuantity <= 0, []);
  const handleCreditSelectionChange = useCallback(
    (credits: AppliedCreditSelection[], total: number) => {
      setAppliedCredits(credits);
      setAppliedCreditTotal(total);
    },
    []
  );

  // Debounced search for patient by mobile
  const debouncedSearchPatient = useCallback(
    async (mobile: string) => {
      if (mobile.length > 5) {
        try {
          const response = await fetch(`/api/patient?search=${encodeURIComponent(mobile)}`);
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.patients);
          } else {
            setSearchResults([]);
          }
        } catch (error) {
          console.error('Error searching patient:', error);
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    },
    []
  );

  // Debounce hook
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (patientSelectionMode === 'existing' && mobileSearch) {
        debouncedSearchPatient(mobileSearch);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [mobileSearch, patientSelectionMode, debouncedSearchPatient]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!session.user.permissions.CREATE_INVOICE) {
      router.push('/dashboard');
      return;
    }
    fetchProducts();
  }, [session, status, router]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchAppointmentsForPatient = useCallback(async (patientId: string) => {
    if (!patientId) {
      return;
    }
    setAppointmentsLoading(true);
    setAppointmentsError('');
    try {
      const response = await fetch(`/api/appointments?patientId=${patientId}&status=scheduled&upcoming=true`);
      if (response.ok) {
        const data = await response.json();
        const scheduledAppointments: AppointmentSummary[] = (data.appointments || []).map((appointment: {
          id: string;
          appointmentDate: string;
          status: string;
          reason?: string | null;
          branch?: string | null;
        }) => ({
          id: appointment.id,
          appointmentDate: appointment.appointmentDate,
          status: appointment.status,
          reason: appointment.reason,
          branch: appointment.branch
        }));
        setPatientAppointments(scheduledAppointments);
        if (!scheduledAppointments.find((appt) => appt.id === selectedAppointmentId)) {
          setSelectedAppointmentId('');
        }
      } else {
        setAppointmentsError('Failed to load appointments for this patient.');
        setPatientAppointments([]);
        setSelectedAppointmentId('');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointmentsError('Unable to load appointments at this time.');
      setPatientAppointments([]);
      setSelectedAppointmentId('');
    } finally {
      setAppointmentsLoading(false);
    }
  }, [selectedAppointmentId]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchAppointmentsForPatient(selectedPatientId);
    } else {
      setPatientAppointments([]);
      setSelectedAppointmentId('');
      setAppointmentsError('');
    }
  }, [selectedPatientId, fetchAppointmentsForPatient]);

  const addRow = () => {
    const newId = Date.now().toString();
    setInvoiceItems([
      ...invoiceItems,
      {
        id: newId,
        productId: '',
        productName: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        discountType: 'percentage',
        discountAmount: 0,
        total: 0,
        isManual: false
      }
    ]);
  };

  const removeRow = (id: string) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter(item => item.id !== id));
      // Clean up search states
      const newSearchTerms = { ...searchTerms };
      const newFilteredProducts = { ...filteredProducts };
      const newShowDropdowns = { ...showDropdowns };
      delete newSearchTerms[id];
      delete newFilteredProducts[id];
      delete newShowDropdowns[id];
      setSearchTerms(newSearchTerms);
      setFilteredProducts(newFilteredProducts);
      setShowDropdowns(newShowDropdowns);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Check if click is inside any search input or dropdown
      const isClickInsideAnySearchArea = Object.keys(searchRefs.current).some(itemId => {
        const ref = searchRefs.current[itemId];
        if (ref && ref.contains(target)) {
          return true;
        }

        // Also check if click is inside the dropdown itself
        const dropdown = ref?.parentElement?.querySelector('.absolute.z-10');
        if (dropdown && dropdown.contains(target)) {
          return true;
        }

        return false;
      });

      if (!isClickInsideAnySearchArea) {
        setShowDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProductSearch = (itemId: string, searchTerm: string) => {
    setSearchTerms({ ...searchTerms, [itemId]: searchTerm });

    if (searchTerm.length > 0) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts({ ...filteredProducts, [itemId]: filtered });
      setShowDropdowns({ ...showDropdowns, [itemId]: true });
    } else {
      setFilteredProducts({ ...filteredProducts, [itemId]: [] });
      setShowDropdowns({ ...showDropdowns, [itemId]: false });
    }

    // Update the item to manual if user is typing
    const itemIndex = invoiceItems.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      const newItems = [...invoiceItems];
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        productName: searchTerm,
        isManual: true,
        productId: ''
      };
      setInvoiceItems(newItems);
    }
  };

  const selectProduct = (itemId: string, product: Product) => {
    const itemIndex = invoiceItems.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      if (isProductOutOfStock(product)) {
        setError(`${product.name} is currently out of stock.`);
        return;
      }

      const availableForItem = getRemainingStock(product.id, itemId);
      if (availableForItem <= 0) {
        setError(`No stock remaining for ${product.name}.`);
        return;
      }

      const newItems = [...invoiceItems];
      const unitPrice = Number(product.price);
      const constrainedQuantity = Math.max(1, Math.min(newItems[itemIndex].quantity, availableForItem));
      const subtotal = constrainedQuantity * unitPrice;
      const discountAmount = newItems[itemIndex].discountType === 'percentage'
        ? (subtotal * newItems[itemIndex].discount) / 100
        : Math.min(newItems[itemIndex].discount, subtotal);
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        productId: product.id,
        productName: product.name,
        quantity: constrainedQuantity,
        unitPrice,
        discountAmount,
        total: subtotal - discountAmount,
        isManual: false
      };
      setInvoiceItems(newItems);
      setSearchTerms({ ...searchTerms, [itemId]: product.name });
      setShowDropdowns({ ...showDropdowns, [itemId]: false });
      setError('');
    }
  };

  const updateItem = (itemId: string, field: 'quantity' | 'unitPrice' | 'discount' | 'discountType', value: number | string) => {
    const itemIndex = invoiceItems.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      const newItems = [...invoiceItems];
      const item = newItems[itemIndex];

      if (field === 'quantity') {
        let requestedQuantity = Number(value);
        if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
          requestedQuantity = 1;
        }

        if (item.productId) {
          const maxAllowed = getRemainingStock(item.productId, item.id);
          if (maxAllowed <= 0) {
            requestedQuantity = 0;
            setError(`No stock remaining for ${item.productName}. Please adjust quantities or remove this item.`);
          } else if (requestedQuantity > maxAllowed) {
            requestedQuantity = maxAllowed;
            setError(`Only ${maxAllowed} units of ${item.productName} are available.`);
          }
        }

        if (!item.productId && requestedQuantity < 1) {
          requestedQuantity = 1;
        }

        item.quantity = requestedQuantity;
      } else if (field === 'unitPrice') {
        item.unitPrice = Math.max(0, Number(value));
      } else if (field === 'discount') {
        item.discount = Math.max(0, Number(value));
      } else if (field === 'discountType') {
        item.discountType = value as 'percentage' | 'fixed';
      }

      // Recalculate totals
      const subtotal = item.quantity * item.unitPrice;
      const discountAmount = item.discountType === 'percentage'
        ? (subtotal * item.discount) / 100
        : Math.min(item.discount, subtotal);
      item.discountAmount = discountAmount;
      item.total = subtotal - discountAmount;

      setInvoiceItems(newItems);
    }
  };

  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotalDiscount = () => {
    return invoiceItems.reduce((sum, item) => sum + item.discountAmount, 0);
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal() - calculateTotalDiscount();
    if (discountType === 'percentage') {
      return (subtotal * discount) / 100;
    }
    return Math.min(discount, subtotal);
  };

  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const itemDiscounts = calculateTotalDiscount();
    const additionalDiscount = calculateDiscountAmount();
    return Math.max(0, subtotal - itemDiscounts - additionalDiscount);
  };

  const calculateDueAmount = () => {
    return Math.max(0, calculateGrandTotal() - paidAmount - appliedCreditTotal);
  };

  const handleCreateNewPatient = async () => {
    if (!session?.user?.permissions?.MANAGE_PATIENT) {
      alert("You don't have access to create a new patient");
      return;
    }

    if (!newPatientForm.patientName || !newPatientForm.patientMobile) {
      setError('Patient name and mobile are required');
      return;
    }

    try {
      const response = await fetch('/api/patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPatientForm),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedPatient(data.patient);
        setPatientSelectionMode('new');
        setSelectedAppointmentId('');
        setPatientAppointments([]);
        setAppointmentsError('');
        setShowNewPatientModal(false);
        setNewPatientForm({ patientName: '', patientMobile: '' });
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create patient');
      }
    } catch (error) {
      console.log(error);
      setError('An error occurred while creating patient.');
    }
  };

  const handleSelectExistingPatient = (foundPatient: Patient) => {
    if (searchResults.length > 0) {
      setSelectedPatient(foundPatient);
      setPatientSelectionMode('existing');
      setSelectedAppointmentId('');
      setPatientAppointments([]);
      setAppointmentsError('');
      setMobileSearch('');
      setSearchResults([]);
    }
  };

  const resetPatientSelection = () => {
    setSelectedPatient(null);
    setPatientSelectionMode('none');
    setSelectedAppointmentId('');
    setPatientAppointments([]);
    setAppointmentsError('');
    setMobileSearch('');
    setSearchResults([]);
    setShowNewPatientModal(false);
    setNewPatientForm({ patientName: '', patientMobile: '' });
    setAppliedCredits([]);
    setAppliedCreditTotal(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!selectedPatient) {
      setError('Please select a patient before creating the invoice.');
      setLoading(false);
      return;
    }

    // Validate items
    const validItems = invoiceItems.filter(item =>
      (item.productName.trim() && item.quantity > 0 && item.unitPrice > 0)
    );

    if (validItems.length === 0) {
      setError('Please add at least one valid product to the invoice.');
      setLoading(false);
      return;
    }

    if (appliedCreditTotal - 0.01 > calculateGrandTotal()) {
      setError('Credits cannot exceed the invoice total.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: validItems.map(item => ({
            productId: item.productId || null,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            discountType: item.discountType,
            discountAmount: item.discountAmount,
            isManual: item.isManual
          })),
          discount,
          discountType,
          patientId: selectedPatient.id,
          branch: branch,
          corporateId,
          paidAmount: paidAmount,
          appointmentId: selectedAppointmentId || null,
          subtotal: calculateSubtotal(),
          itemDiscounts: calculateTotalDiscount(),
          discountAmount: calculateDiscountAmount(),
          grandTotal: calculateGrandTotal(),
          appliedCredits
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/invoices/${data.invoice.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.log(error)
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create New Invoice
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Search for products or enter them manually with quantities and pricing.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="border-t border-gray-200">
              <div className="px-4 py-5 sm:p-6">
                {error && (
                  <div className="mb-4 rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}

                {/* Patient Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Patient Selection
                  </label>

                  {patientSelectionMode === 'none' && (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (session?.user?.permissions?.MANAGE_PATIENT) {
                            setShowNewPatientModal(true);
                          } else {
                            alert("You don't have access to create a new patient");
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        New Patient
                      </button>
                      <button
                        type="button"
                        onClick={() => setPatientSelectionMode('existing')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                      >
                        Existing Patient
                      </button>
                    </div>
                  )}

                  {patientSelectionMode === 'existing' && !selectedPatient && (
                    <div className="space-y-3">
                      <div>
                        <input
                          type="text"
                          value={mobileSearch}
                          onChange={(e) => setMobileSearch(e.target.value)}
                          placeholder="Enter mobile number to search..."
                          className="block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      {searchResults && searchResults.map((f) => (
                        <div className="p-3 border border-green-200 rounded-md bg-green-50" key={f.id}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-green-900">{f.patientName}</p>
                              <p className="text-sm text-green-700">{f.patientMobile}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectExistingPatient(f)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Select
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={resetPatientSelection}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        ← Back to selection
                      </button>
                    </div>
                  )}

                  {selectedPatient && (
                    <div className="p-3 border border-blue-200 rounded-md bg-blue-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-blue-900">{selectedPatient.patientName}</p>
                          <p className="text-sm text-blue-700">{selectedPatient.patientMobile}</p>
                        </div>
                        <button
                          type="button"
                          onClick={resetPatientSelection}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Deselect
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {selectedPatient && (
                  <div className="mb-6">
                    <PatientCreditSelector
                      patientId={selectedPatient.id}
                      onChange={handleCreditSelectionChange}
                    />
                  </div>
                )}

                {selectedPatient && (
                  <div className="mb-6 border-t pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">Linked Appointment</h4>
                        <p className="text-sm text-gray-500">
                          Attach an upcoming appointment to automatically mark it completed.
                        </p>
                      </div>
                      {selectedAppointmentId && (
                        <button
                          type="button"
                          onClick={() => setSelectedAppointmentId('')}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    {appointmentsLoading ? (
                      <div className="text-sm text-gray-500">Loading upcoming appointments...</div>
                    ) : appointmentsError ? (
                      <div className="text-sm text-red-600">{appointmentsError}</div>
                    ) : patientAppointments.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        No upcoming scheduled appointments for this patient.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {patientAppointments.map((appointment) => {
                          const formattedDate = new Date(appointment.appointmentDate).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          });
                          const isSelected = selectedAppointmentId === appointment.id;
                          return (
                            <label
                              key={appointment.id}
                              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                                }`}
                            >
                              <input
                                type="radio"
                                name="appointment"
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                                checked={isSelected}
                                onChange={() => setSelectedAppointmentId(appointment.id)}
                              />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {formattedDate}
                                  {appointment.branch && (
                                    <span className="text-sm text-gray-500"> • {appointment.branch}</span>
                                  )}
                                </p>
                                {appointment.reason && (
                                  <p className="text-sm text-gray-600">Reason: {appointment.reason}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {invoiceItems.map((item) => {
                    const selectedProduct = item.productId ? getProductById(item.productId) : null;
                    const allocatedElsewhere = item.productId ? getAllocatedQuantity(item.productId, item.id) : 0;
                    const maxForThisLine = item.productId ? getRemainingStock(item.productId, item.id) : 0;
                    const remainingAfterCurrent = selectedProduct
                      ? Math.max(0, selectedProduct.stockQuantity - (allocatedElsewhere + item.quantity))
                      : 0;
                    const showLowStockBanner = selectedProduct ? isProductLowStock(selectedProduct) : false;

                    return (
                      <div key={item.id} className="grid grid-cols-1 gap-4 sm:grid-cols-12 p-4 border border-gray-200 rounded-lg relative">
                        <div className="sm:col-span-4 relative">
                          <label className="block text-sm font-medium text-gray-700">
                            Product Name
                          </label>
                          <input
                            ref={el => { searchRefs.current[item.id] = el; }}
                            type="text"
                            value={searchTerms[item.id] || item.productName}
                            onChange={(e) => handleProductSearch(item.id, e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                            placeholder="Search products or enter manually..."
                          />

                          {/* Dropdown for search results */}
                          {showDropdowns[item.id] && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                              {filteredProducts[item.id]?.length > 0 ? (
                                filteredProducts[item.id].map((product) => {
                                  const remainingForRow = getRemainingStock(product.id, item.id);
                                  const lowStock = isProductLowStock(product);
                                  const outOfStock = isProductOutOfStock(product) || remainingForRow <= 0;

                                  return (
                                    <div
                                      key={product.id}
                                      className={`select-none relative py-2 pl-3 pr-9 ${outOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50'
                                        }`}
                                      onMouseDown={(e) => {
                                        if (outOfStock) {
                                          e.preventDefault();
                                          setError(`${product.name} has no available stock.`);
                                          return;
                                        }
                                        e.preventDefault();
                                        selectProduct(item.id, product);
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">
                                          {product.name}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                          ৳{Number(product.price).toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs mt-1">
                                        <span className="text-gray-500">
                                          {product.category.title}
                                        </span>
                                        <span className={`font-semibold ${lowStock ? 'text-orange-600' : 'text-gray-500'}`}>
                                          In Stock: {product.stockQuantity}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Available for this invoice: {remainingForRow}
                                        {outOfStock && (
                                          <span className="ml-1 text-red-600 font-semibold">
                                            (Unavailable)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : searchTerms[item.id]?.trim() && (
                                <div
                                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-yellow-50 border-t border-gray-100"
                                  onClick={() => {
                                    const itemIndex = invoiceItems.findIndex(invoiceItem => invoiceItem.id === item.id);
                                    if (itemIndex !== -1) {
                                      const newItems = [...invoiceItems];
                                      newItems[itemIndex] = {
                                        ...newItems[itemIndex],
                                        isManual: true,
                                        productId: '',
                                        productName: searchTerms[item.id].trim(),
                                        unitPrice: 0
                                      };
                                      setInvoiceItems(newItems);
                                      setShowDropdowns({ ...showDropdowns, [item.id]: false });
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900">
                                      Add `{searchTerms[item.id].trim()}` manually
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                      Manual
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    Click to add as custom product
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className='w-full col-span-8 grid sm:grid-cols-5 items-center gap-5'>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Unit Price (৳)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                              disabled={(!item.isManual && item.productId) ? true : false}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Discount Type
                            </label>
                            <select
                              value={item.discountType}
                              onChange={(e) => updateItem(item.id, 'discountType', e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                            >
                              <option value="percentage">%</option>
                              <option value="fixed">৳</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Discount
                            </label>
                            <input
                              type="number"
                              step={item.discountType === 'percentage' ? '1' : '0.01'}
                              min="0"
                              max={item.discountType === 'percentage' ? '100' : undefined}
                              value={item.discount}
                              onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                              className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Total
                            </label>
                            <input
                              type="text"
                              value={`৳${item.total.toFixed(2)}`}
                              disabled
                              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 py-2 px-3 text-gray-500 sm:text-sm"
                            />
                          </div>
                        </div>


                        <div className="flex items-end">
                          {invoiceItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(item.id)}
                              className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        {item.isManual && (
                          <div className="sm:col-span-12">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Manual Entry
                            </span>
                          </div>
                        )}
                        {selectedProduct && (
                          <div className="sm:col-span-12 text-xs text-gray-600 space-y-1">
                            <div className="flex flex-wrap gap-4">
                              <span>Stock on hand: {selectedProduct.stockQuantity}</span>
                              <span>Max allocatable for this line: {maxForThisLine}</span>
                              <span>Remaining after this line: {remainingAfterCurrent}</span>
                              {selectedProduct.lowStockThreshold > 0 && (
                                <span>Threshold: {selectedProduct.lowStockThreshold}</span>
                              )}
                            </div>
                            {showLowStockBanner && (
                              <p className="text-orange-600 font-medium">
                                Low stock warning — consider replenishing soon.
                              </p>
                            )}
                            {item.quantity === 0 && (
                              <p className="text-red-600 font-medium">
                                No stock available. Remove this item or adjust other quantities.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                  >
                    + Add Product
                  </button>
                </div>

                {/* Paid Amount Section */}
                <div className="mt-6 border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Paid Amount (৳)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Discount Section */}
                <div className="mt-6 border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Additional Discount</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Discount Type
                      </label>
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (৳)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Discount Value
                      </label>
                      <input
                        type="number"
                        step={discountType === 'percentage' ? '1' : '0.01'}
                        min="0"
                        max={discountType === 'percentage' ? '100' : undefined}
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        placeholder={discountType === 'percentage' ? '10' : '50.00'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Discount Amount
                      </label>
                      <input
                        type="text"
                        value={`৳${calculateDiscountAmount().toFixed(2)}`}
                        disabled
                        className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 py-2 px-3 text-gray-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Branch Selection and corporate id */}
                <div className='mt-6 border-t pt-6'>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">{"Branch & Corporate ID"}</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Select Branch
                      </label>
                      <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="Hathazari Branch">Hathazari Branch</option>
                        <option value="Kazir Dewri Branch">Kazir Dewri Branch</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Corporate ID
                      </label>
                      <input
                        type="text"
                        value={corporateId}
                        placeholder='Enter Corporate ID'
                        onChange={(e) => setCorporateId(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Totals Section */}
                <div className="mt-6 border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">৳{calculateSubtotal().toFixed(2)}</span>
                      </div>
                      {calculateTotalDiscount() > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Item Discounts:</span>
                          <span>-৳{calculateTotalDiscount().toFixed(2)}</span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Additional Discount ({discountType === 'percentage' ? `${discount}%` : '৳' + discount.toFixed(2)}):</span>
                          <span>-৳{calculateDiscountAmount().toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-semibold border-t pt-2">
                        <span>Grand Total:</span>
                        <span>৳{calculateGrandTotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Paid:</span>
                        <span>৳{paidAmount.toFixed(2)}</span>
                      </div>
                      {appliedCreditTotal > 0 && (
                        <div className="flex justify-between text-sm text-blue-600">
                          <span>Credits Applied:</span>
                          <span>-৳{appliedCreditTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-medium text-orange-600">
                        <span>Due:</span>
                        <span>৳{calculateDueAmount().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="mr-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* New Patient Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New Patient
              </h3>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    value={newPatientForm.patientName}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, patientName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm border"
                    placeholder="Enter patient name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={newPatientForm.patientMobile}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, patientMobile: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm border"
                    placeholder="Enter mobile number"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewPatientModal(false);
                      setNewPatientForm({ patientName: '', patientMobile: '' });
                      setError('');
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewPatient}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    Create Patient
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
