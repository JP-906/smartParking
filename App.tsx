
import React, { useState, useEffect, useMemo } from 'react';
import { Page, HOURLY_RATE, CURRENCY } from './constants';
import { SlotStatus, ParkingSlot, Car, ParkingRecord, Payment, User } from './types';
import Layout from './components/Layout';

const App: React.FC = () => {
  // State initialization
  const [currentPage, setCurrentPage] = useState<Page>(Page.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [records, setRecords] = useState<ParkingRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Filter states for Parking Record
  const [searchPlate, setSearchPlate] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Completed'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter state for Car Page
  const [searchCar, setSearchCar] = useState('');

  // Form states
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [carForm, setCarForm] = useState({ plateNumber: '', driverName: '', phoneNumber: '' });
  const [slotForm, setSlotForm] = useState({ slotNumber: '' });
  const [editingRecord, setEditingRecord] = useState<ParkingRecord | null>(null);

  // Load data from "database" (LocalStorage)
  useEffect(() => {
    const savedUser = localStorage.getItem('smartpark_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setCurrentPage(Page.CAR);
    }

    const savedSlots = localStorage.getItem('smartpark_slots');
    if (savedSlots) setSlots(JSON.parse(savedSlots));
    else {
      // Seed initial slots
      const initialSlots: ParkingSlot[] = [
        { id: '1', slotNumber: 'P-01', status: SlotStatus.AVAILABLE },
        { id: '2', slotNumber: 'P-02', status: SlotStatus.AVAILABLE },
        { id: '3', slotNumber: 'P-03', status: SlotStatus.AVAILABLE },
        { id: '4', slotNumber: 'P-04', status: SlotStatus.AVAILABLE },
      ];
      setSlots(initialSlots);
    }

    setCars(JSON.parse(localStorage.getItem('smartpark_cars') || '[]'));
    setRecords(JSON.parse(localStorage.getItem('smartpark_records') || '[]'));
    setPayments(JSON.parse(localStorage.getItem('smartpark_payments') || '[]'));
  }, []);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('smartpark_slots', JSON.stringify(slots));
    localStorage.setItem('smartpark_cars', JSON.stringify(cars));
    localStorage.setItem('smartpark_records', JSON.stringify(records));
    localStorage.setItem('smartpark_payments', JSON.stringify(payments));
  }, [slots, cars, records, payments]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Updated credentials: admin / admin
    if (loginForm.username === 'admin' && loginForm.password === 'admin') {
      const newUser = { username: loginForm.username, isLoggedIn: true };
      setUser(newUser);
      localStorage.setItem('smartpark_user', JSON.stringify(newUser));
      setCurrentPage(Page.CAR);
    } else {
      alert('Invalid credentials. Use admin/admin');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('smartpark_user');
    setCurrentPage(Page.LOGIN);
  };

  const addCar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!carForm.plateNumber || !carForm.driverName) return;
    const newCar: Car = { ...carForm };
    setCars([...cars, newCar]);
    setCarForm({ plateNumber: '', driverName: '', phoneNumber: '' });
  };

  const addSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotForm.slotNumber) return;
    const newSlot: ParkingSlot = {
      id: Date.now().toString(),
      slotNumber: slotForm.slotNumber,
      status: SlotStatus.AVAILABLE
    };
    setSlots([...slots, newSlot]);
    setSlotForm({ slotNumber: '' });
  };

  const startParking = (plateNumber: string, slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot || slot.status === SlotStatus.OCCUPIED) return;

    const newRecord: ParkingRecord = {
      id: Date.now().toString(),
      plateNumber,
      slotNumber: slot.slotNumber,
      entryTime: new Date().toISOString(),
      status: 'Active'
    };

    setRecords([...records, newRecord]);
    setSlots(slots.map(s => s.id === slotId ? { ...s, status: SlotStatus.OCCUPIED } : s));
    alert(`Car ${plateNumber} parked in ${slot.slotNumber}`);
  };

  const calculateFee = (entryStr: string, exitStr: string) => {
    const entry = new Date(entryStr);
    const exit = new Date(exitStr);
    const diffMs = exit.getTime() - entry.getTime();
    const hours = Math.ceil(diffMs / (1000 * 60 * 60)); // Hourly based, rounding up
    return {
      hours: Math.max(1, hours),
      amount: Math.max(1, hours) * HOURLY_RATE
    };
  };

  const exitParking = (recordId: string) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    const exitTime = new Date().toISOString();
    const { hours, amount } = calculateFee(record.entryTime, exitTime);

    const updatedRecord: ParkingRecord = {
      ...record,
      exitTime,
      duration: hours,
      amountPaid: amount,
      status: 'Completed'
    };

    const newPayment: Payment = {
      id: Date.now().toString(),
      recordId,
      plateNumber: record.plateNumber,
      amountPaid: amount,
      paymentDate: exitTime
    };

    setRecords(records.map(r => r.id === recordId ? updatedRecord : r));
    setPayments([...payments, newPayment]);
    
    // Free up slot
    setSlots(slots.map(s => s.slotNumber === record.slotNumber ? { ...s, status: SlotStatus.AVAILABLE } : s));

    alert(`Receipt Generated: ${record.plateNumber} | Amount: ${amount} ${CURRENCY}`);
  };

  const updateRecord = (id: string, updatedData: Partial<ParkingRecord>) => {
    setRecords(records.map(r => r.id === id ? { ...r, ...updatedData } : r));
    setEditingRecord(null);
  };

  const deleteRecord = (id: string) => {
    if (window.confirm('Are you sure you want to delete this parking record?')) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  // Memoized filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch = record.plateNumber.toLowerCase().includes(searchPlate.toLowerCase());
      const matchesStatus = filterStatus === 'All' || record.status === filterStatus;
      
      const recordDate = new Date(record.entryTime);
      recordDate.setHours(0, 0, 0, 0);

      let matchesDate = true;
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (recordDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        if (recordDate > end) matchesDate = false;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [records, searchPlate, filterStatus, startDate, endDate]);

  // Memoized filtered cars
  const filteredCars = useMemo(() => {
    return cars.filter(car => 
      car.plateNumber.toLowerCase().includes(searchCar.toLowerCase()) ||
      car.driverName.toLowerCase().includes(searchCar.toLowerCase())
    );
  }, [cars, searchCar]);

  const clearFilters = () => {
    setSearchPlate('');
    setFilterStatus('All');
    setStartDate('');
    setEndDate('');
  };

  if (currentPage === Page.LOGIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-xl shadow-lg">
              <i className="fas fa-parking text-white text-3xl"></i>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">SmartPark</h2>
          <p className="text-center text-slate-500 mb-8">Parking Space Sales Management</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
              <div className="relative">
                <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="admin"
                  value={loginForm.username}
                  onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transform active:scale-95 transition-all"
            >
              Login to PSSMS
            </button>
          </form>
          <p className="mt-8 text-center text-xs text-slate-400 uppercase tracking-widest">
            Rubavu District Office
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      currentPage={currentPage} 
      setCurrentPage={setCurrentPage} 
      onLogout={handleLogout}
      user={user?.username || 'Admin'}
    >
      {/* Car View */}
      {currentPage === Page.CAR && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <i className="fas fa-plus-circle text-blue-600"></i> Register New Vehicle
            </h3>
            <form onSubmit={addCar} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                className="p-3 border rounded-lg"
                placeholder="Plate Number (e.g. RAC 123 A)"
                value={carForm.plateNumber}
                onChange={e => setCarForm({ ...carForm, plateNumber: e.target.value.toUpperCase() })}
                required
              />
              <input
                className="p-3 border rounded-lg"
                placeholder="Driver Name"
                value={carForm.driverName}
                onChange={e => setCarForm({ ...carForm, driverName: e.target.value })}
                required
              />
              <input
                className="p-3 border rounded-lg"
                placeholder="Phone Number"
                value={carForm.phoneNumber}
                onChange={e => setCarForm({ ...carForm, phoneNumber: e.target.value })}
              />
              <button type="submit" className="md:col-span-3 bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700">
                Register Car
              </button>
            </form>
          </div>

          {/* Car Search Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search by plate number or driver name..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                value={searchCar}
                onChange={(e) => setSearchCar(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold text-sm">
                <tr>
                  <th className="px-6 py-4">Plate Number</th>
                  <th className="px-6 py-4">Driver Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCars.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                      {searchCar ? 'No vehicles found matching your search.' : 'No cars registered yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredCars.map(car => (
                    <tr key={car.plateNumber} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">{car.plateNumber}</td>
                      <td className="px-6 py-4">{car.driverName}</td>
                      <td className="px-6 py-4 text-slate-500">{car.phoneNumber || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => {
                            const availableSlot = slots.find(s => s.status === SlotStatus.AVAILABLE);
                            if (availableSlot) startParking(car.plateNumber, availableSlot.id);
                            else alert('No parking slots available!');
                          }}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1"
                        >
                          <i className="fas fa-sign-in-alt"></i> Assign Parking
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slot View */}
      {currentPage === Page.PARKING_SLOT && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Create Parking Slot</h3>
            <form onSubmit={addSlot} className="flex gap-4">
              <input
                className="flex-1 p-3 border rounded-lg"
                placeholder="Slot Number (e.g. A-101)"
                value={slotForm.slotNumber}
                onChange={e => setSlotForm({ ...slotForm, slotNumber: e.target.value.toUpperCase() })}
                required
              />
              <button type="submit" className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700">
                Add Slot
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {slots.map(slot => (
              <div 
                key={slot.id} 
                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                  slot.status === SlotStatus.AVAILABLE 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                <i className={`fas ${slot.status === SlotStatus.AVAILABLE ? 'fa-check-circle' : 'fa-car-side'} text-2xl`}></i>
                <span className="font-bold text-lg">{slot.slotNumber}</span>
                <span className="text-xs uppercase tracking-widest font-semibold">{slot.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record View (CRUD with Search/Filter) */}
      {currentPage === Page.PARKING_RECORD && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search Plate</label>
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="RAC 123..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={searchPlate}
                  onChange={(e) => setSearchPlate(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-40">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
              <select
                className="w-full px-3 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm appearance-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Completed">Completed Only</option>
              </select>
            </div>
            <div className="w-full md:w-44">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-full md:w-44">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button
              onClick={clearFilters}
              className="w-full md:w-auto px-4 py-2 text-sm font-semibold text-gray-600 hover:text-rose-600 transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold text-sm">
                <tr>
                  <th className="px-6 py-4">Plate</th>
                  <th className="px-6 py-4">Slot</th>
                  <th className="px-6 py-4">Entry</th>
                  <th className="px-6 py-4">Exit</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">No records match your filters.</td>
                  </tr>
                ) : (
                  filteredRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-gray-50 text-sm">
                      <td className="px-6 py-4 font-mono font-bold">{rec.plateNumber}</td>
                      <td className="px-6 py-4 font-semibold">{rec.slotNumber}</td>
                      <td className="px-6 py-4">{new Date(rec.entryTime).toLocaleTimeString()}</td>
                      <td className="px-6 py-4">{rec.exitTime ? new Date(rec.exitTime).toLocaleTimeString() : '--'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          rec.status === 'Active' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        {rec.status === 'Active' ? (
                          <button 
                            onClick={() => exitParking(rec.id)}
                            className="text-emerald-600 hover:text-emerald-800 font-bold"
                          >
                            Checkout
                          </button>
                        ) : (
                          <button 
                            className="text-gray-400 cursor-not-allowed"
                            disabled
                          >
                            Paid
                          </button>
                        )}
                        <button 
                          onClick={() => setEditingRecord(rec)}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          onClick={() => deleteRecord(rec.id)}
                          className="text-rose-600 hover:text-rose-800"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Edit Modal */}
          {editingRecord && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
              <div className="bg-white p-6 rounded-xl max-w-sm w-full">
                <h3 className="text-xl font-bold mb-4">Edit Record</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Plate Number</label>
                    <input 
                      className="w-full p-2 border rounded mt-1" 
                      value={editingRecord.plateNumber} 
                      onChange={e => setEditingRecord({...editingRecord, plateNumber: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Slot Number</label>
                    <input 
                      className="w-full p-2 border rounded mt-1" 
                      value={editingRecord.slotNumber} 
                      onChange={e => setEditingRecord({...editingRecord, slotNumber: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button 
                      onClick={() => updateRecord(editingRecord.id, editingRecord)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded font-bold"
                    >
                      Save Changes
                    </button>
                    <button 
                      onClick={() => setEditingRecord(null)}
                      className="flex-1 bg-gray-200 py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment View */}
      {currentPage === Page.PAYMENT && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-600 p-6 rounded-xl text-white">
              <p className="text-sm opacity-80">Total Revenue</p>
              <h4 className="text-2xl font-bold">
                {payments.reduce((acc, p) => acc + p.amountPaid, 0).toLocaleString()} {CURRENCY}
              </h4>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500">Transactions Today</p>
              <h4 className="text-2xl font-bold text-gray-800">
                {payments.filter(p => new Date(p.paymentDate).toDateString() === new Date().toDateString()).length}
              </h4>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500">Avg. Ticket</p>
              <h4 className="text-2xl font-bold text-gray-800">
                {payments.length > 0 ? (payments.reduce((acc, p) => acc + p.amountPaid, 0) / payments.length).toFixed(0) : 0} {CURRENCY}
              </h4>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold text-sm">
                <tr>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Plate</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(pay => (
                  <tr key={pay.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">#{pay.id}</td>
                    <td className="px-6 py-4 font-bold">{pay.plateNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(pay.paymentDate).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">{pay.amountPaid.toLocaleString()} {CURRENCY}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports View */}
      {currentPage === Page.REPORTS && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100" id="daily-report">
            <div className="flex justify-between items-start mb-8 border-b pb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">SmartPark Rubavu</h2>
                <p className="text-gray-500">Daily Parking Payment Report</p>
                <p className="text-sm text-gray-400 mt-1">Generated: {new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase">Official Document</span>
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-2">Plate Number</th>
                  <th className="py-3 px-2">Entry Time</th>
                  <th className="py-3 px-2">Exit Time</th>
                  <th className="py-3 px-2 text-center">Duration (Hrs)</th>
                  <th className="py-3 px-2 text-right">Amount ({CURRENCY})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.filter(r => r.status === 'Completed').map(r => (
                  <tr key={r.id} className="text-sm">
                    <td className="py-4 px-2 font-mono font-bold">{r.plateNumber}</td>
                    <td className="py-4 px-2 text-gray-500">{new Date(r.entryTime).toLocaleTimeString()}</td>
                    <td className="py-4 px-2 text-gray-500">{r.exitTime ? new Date(r.exitTime).toLocaleTimeString() : '--'}</td>
                    <td className="py-4 px-2 text-center font-semibold">{r.duration}</td>
                    <td className="py-4 px-2 text-right font-bold text-slate-800">{(r.amountPaid || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-800">
                <tr className="font-bold text-lg">
                  <td colSpan={4} className="py-6 px-2 text-right text-slate-500">Grand Total:</td>
                  <td className="py-6 px-2 text-right text-blue-600">
                    {records.reduce((acc, r) => acc + (r.amountPaid || 0), 0).toLocaleString()} {CURRENCY}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-12 flex justify-between items-end">
              <div className="text-center w-48">
                <div className="border-b border-gray-400 mb-2 h-12"></div>
                <p className="text-xs text-gray-500 uppercase">Manager Signature</p>
              </div>
              <div className="text-right text-xs text-gray-400">
                <p>SmartPark PSSMS v1.0</p>
                <p>Rubavu District, Western Province, Rwanda</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button 
              onClick={() => window.print()} 
              className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-700 flex items-center gap-2 shadow-lg"
            >
              <i className="fas fa-print"></i> Print Report
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
