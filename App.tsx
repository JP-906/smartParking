
import React, { useState, useEffect, useMemo } from 'react';
import { Page, HOURLY_RATE, CURRENCY } from './constants';
import { SlotStatus, ParkingSlot, Car, ParkingRecord, Payment, User } from './types';
import Layout from './components/Layout';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'https://esm.sh/recharts';

/**
 * LiveCounter Component
 * Displays real-time elapsed time and calculated fee for active parking sessions.
 * Features side-by-side high-contrast layout for maximum clarity.
 */
const LiveCounter: React.FC<{ entryTime: string }> = ({ entryTime }) => {
  const [elapsed, setElapsed] = useState('');
  const [currentFee, setCurrentFee] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const entry = new Date(entryTime);
      const diff = now.getTime() - entry.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      
      // Calculate fee: 500 Rwf per hour, minimum 1 hour, rounding up.
      const billableHours = Math.ceil(diff / (1000 * 60 * 60));
      setCurrentFee(Math.max(1, billableHours) * HOURLY_RATE);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [entryTime]);

  return (
    <div className="flex items-center gap-4 py-1.5 px-3 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-tight">Time Elapsed</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          <span className="font-mono text-slate-900 font-black text-sm tracking-widest">{elapsed}</span>
        </div>
      </div>
      <div className="h-8 w-px bg-slate-100"></div>
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-tight">Running Fee</span>
        <span className="text-emerald-700 font-black text-sm mt-0.5 whitespace-nowrap">
          {currentFee.toLocaleString()} <span className="text-[10px] opacity-70">{CURRENCY}</span>
        </span>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [records, setRecords] = useState<ParkingRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Search & Filters
  const [searchPlate, setSearchPlate] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Completed'>('All');
  const [searchCar, setSearchCar] = useState('');

  // Modals / Selections
  const [selectedCarForParking, setSelectedCarForParking] = useState<Car | null>(null);
  const [selectedSlotForParking, setSelectedSlotForParking] = useState<ParkingSlot | null>(null);

  // Forms
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [carForm, setCarForm] = useState({ plateNumber: '', driverName: '', phoneNumber: '' });
  const [slotForm, setSlotForm] = useState({ slotNumber: '' });

  // Persistence logic (Load)
  useEffect(() => {
    const savedUser = localStorage.getItem('smartpark_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setCurrentPage(Page.CAR);
    }
    const savedSlots = localStorage.getItem('smartpark_slots');
    if (savedSlots) setSlots(JSON.parse(savedSlots));
    else {
      const initialSlots: ParkingSlot[] = Array.from({ length: 12 }, (_, i) => ({
        id: (i + 1).toString(),
        slotNumber: `P-${(i + 1).toString().padStart(2, '0')}`,
        status: SlotStatus.AVAILABLE
      }));
      setSlots(initialSlots);
    }
    setCars(JSON.parse(localStorage.getItem('smartpark_cars') || '[]'));
    setRecords(JSON.parse(localStorage.getItem('smartpark_records') || '[]'));
    setPayments(JSON.parse(localStorage.getItem('smartpark_payments') || '[]'));
  }, []);

  // Persistence logic (Save)
  useEffect(() => {
    localStorage.setItem('smartpark_slots', JSON.stringify(slots));
    localStorage.setItem('smartpark_cars', JSON.stringify(cars));
    localStorage.setItem('smartpark_records', JSON.stringify(records));
    localStorage.setItem('smartpark_payments', JSON.stringify(payments));
  }, [slots, cars, records, payments]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'admin') {
      const newUser = { username: loginForm.username, isLoggedIn: true };
      setUser(newUser);
      localStorage.setItem('smartpark_user', JSON.stringify(newUser));
      setCurrentPage(Page.CAR);
    } else {
      alert('Invalid credentials. Hint: admin/admin');
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
    if (cars.some(c => c.plateNumber === carForm.plateNumber)) {
      alert('Vehicle already registered in the system.');
      return;
    }
    setCars([...cars, { ...carForm }]);
    setCarForm({ plateNumber: '', driverName: '', phoneNumber: '' });
  };

  const startParking = (plateNumber: string, slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    const car = cars.find(c => c.plateNumber === plateNumber);
    if (!slot || slot.status === SlotStatus.OCCUPIED || !car) return;

    const newRecord: ParkingRecord = {
      id: Date.now().toString(),
      plateNumber,
      driverName: car.driverName,
      slotNumber: slot.slotNumber,
      entryTime: new Date().toISOString(),
      status: 'Active'
    };

    setRecords([...records, newRecord]);
    setSlots(slots.map(s => s.id === slotId ? { ...s, status: SlotStatus.OCCUPIED } : s));
    setSelectedCarForParking(null);
    setSelectedSlotForParking(null);
  };

  const exitParking = (recordId: string) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    const exitTime = new Date().toISOString();
    const entry = new Date(record.entryTime);
    const exit = new Date(exitTime);
    const hours = Math.ceil((exit.getTime() - entry.getTime()) / (1000 * 60 * 60));
    const finalHours = Math.max(1, hours);
    const amount = finalHours * HOURLY_RATE;

    const updatedRecord: ParkingRecord = {
      ...record,
      exitTime,
      duration: finalHours,
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
    setSlots(slots.map(s => s.slotNumber === record.slotNumber ? { ...s, status: SlotStatus.AVAILABLE } : s));
  };

  const deleteRecord = (id: string) => {
    if (!window.confirm('Are you sure? This action cannot be undone.')) return;
    const record = records.find(r => r.id === id);
    if (record?.status === 'Active') {
      setSlots(slots.map(s => s.slotNumber === record.slotNumber ? { ...s, status: SlotStatus.AVAILABLE } : s));
    }
    setRecords(records.filter(r => r.id !== id));
  };

  const filteredCars = useMemo(() => 
    cars.filter(c => c.plateNumber.includes(searchCar.toUpperCase()) || c.driverName.toLowerCase().includes(searchCar.toLowerCase())), 
    [cars, searchCar]
  );
  
  const filteredRecords = useMemo(() => 
    records.filter(r => r.plateNumber.includes(searchPlate.toUpperCase()) && (filterStatus === 'All' || r.status === filterStatus)), 
    [records, searchPlate, filterStatus]
  );

  const analyticsData = useMemo(() => {
    const revByDay: Record<string, number> = {};
    payments.forEach(p => {
      const date = new Date(p.paymentDate).toLocaleDateString();
      revByDay[date] = (revByDay[date] || 0) + p.amountPaid;
    });
    const revenueTrend = Object.entries(revByDay).map(([date, amount]) => ({ date, amount })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const slotCounts: Record<string, number> = {};
    records.forEach(r => {
      slotCounts[r.slotNumber] = (slotCounts[r.slotNumber] || 0) + 1;
    });
    const slotUsage = Object.entries(slotCounts).map(([slot, count]) => ({ slot, count })).sort((a,b) => b.count - a.count).slice(0, 8);

    return { revenueTrend, slotUsage };
  }, [payments, records]);

  if (currentPage === Page.LOGIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md">
          <div className="flex justify-center mb-8">
            <div className="bg-blue-600 p-5 rounded-2xl shadow-xl rotate-3">
              <i className="fas fa-parking text-white text-4xl"></i>
            </div>
          </div>
          <h2 className="text-3xl font-black text-center text-slate-900 mb-2 tracking-tighter">SmartPark</h2>
          <p className="text-center text-slate-500 mb-10 font-bold uppercase text-[10px] tracking-[0.2em]">Rubavu District PSSMS</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 focus:border-blue-500 outline-none transition-all font-bold" placeholder="Username" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} />
            <input type="password" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 focus:border-blue-500 outline-none transition-all font-bold" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg uppercase tracking-widest text-sm">Log In</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} user={user?.username || 'Admin'}>
      {/* -------------------- VEHICLE REGISTRATION -------------------- */}
      {currentPage === Page.CAR && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black mb-6 text-slate-900 flex items-center gap-2">
              <i className="fas fa-plus-circle text-blue-600"></i> New Vehicle Registration
            </h3>
            <form onSubmit={addCar} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Plate Number</label>
                <input className="w-full p-4 border-2 border-slate-50 rounded-xl text-slate-900 uppercase font-black bg-slate-50 focus:border-blue-500 transition-all outline-none" placeholder="RAB 000X" value={carForm.plateNumber} onChange={e => setCarForm({ ...carForm, plateNumber: e.target.value.toUpperCase() })} required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Driver's Name</label>
                <input className="w-full p-4 border-2 border-slate-50 rounded-xl text-slate-900 font-bold bg-slate-50 focus:border-blue-500 transition-all outline-none" placeholder="Full Name" value={carForm.driverName} onChange={e => setCarForm({ ...carForm, driverName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Phone Number</label>
                <input className="w-full p-4 border-2 border-slate-50 rounded-xl text-slate-900 font-bold bg-slate-50 focus:border-blue-500 transition-all outline-none" placeholder="07xxxxxxxx" value={carForm.phoneNumber} onChange={e => setCarForm({ ...carForm, phoneNumber: e.target.value })} />
              </div>
              <button type="submit" className="md:col-span-3 bg-slate-900 text-white p-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-lg">Submit Registration</button>
            </form>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b">
                <tr>
                  <th className="px-8 py-5">Vehicle Plate</th>
                  <th className="px-8 py-5">Driver Name</th>
                  <th className="px-8 py-5">Current Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCars.map(car => (
                  <tr key={car.plateNumber} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 font-mono font-black text-slate-900 text-lg">{car.plateNumber}</td>
                    <td className="px-8 py-5 text-slate-800 font-bold">{car.driverName}</td>
                    <td className="px-8 py-5">
                      {records.some(r => r.plateNumber === car.plateNumber && r.status === 'Active') 
                        ? <span className="text-rose-600 font-black text-[10px] uppercase bg-rose-50 px-3 py-1 rounded-full border border-rose-100">In Parking</span>
                        : <span className="text-emerald-600 font-black text-[10px] uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Ready</span>}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {!records.some(r => r.plateNumber === car.plateNumber && r.status === 'Active') && (
                        <button onClick={() => setSelectedCarForParking(car)} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Park Now</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- PARKING RECORDS -------------------- */}
      {currentPage === Page.PARKING_RECORD && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-6 items-end">
            <div className="flex-1 min-w-[240px] space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Search Plate</label>
              <input className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl text-slate-900 font-black uppercase outline-none focus:border-blue-500 transition-all" placeholder="Enter Plate..." value={searchPlate} onChange={e => setSearchPlate(e.target.value.toUpperCase())} />
            </div>
            <div className="w-56 space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Filter Status</label>
              <select className="w-full p-3 bg-slate-50 border-2 border-slate-50 rounded-xl text-slate-900 font-bold outline-none focus:border-blue-500" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
                <option value="All">All Transactions</option>
                <option value="Active">Active Sessions</option>
                <option value="Completed">Completed History</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-6">Plate</th>
                  <th className="px-8 py-6">Driver Identity</th>
                  <th className="px-8 py-6 text-center">Slot</th>
                  <th className="px-8 py-6">Live Counter & Dynamic Fee</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-8 py-6">
                      <span className="font-mono font-black text-slate-900 text-lg">{rec.plateNumber}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-black text-sm">{rec.driverName}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Checked-in: {new Date(rec.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-lg font-black text-xs shadow-sm">{rec.slotNumber}</span>
                    </td>
                    <td className="px-8 py-6">
                      {rec.status === 'Active' ? (
                        <LiveCounter entryTime={rec.entryTime} />
                      ) : (
                        <div className="flex items-center gap-4 py-1.5 px-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Duration</span>
                            <span className="text-slate-900 font-black text-sm">{rec.duration} Hour(s)</span>
                          </div>
                          <div className="h-8 w-px bg-slate-200"></div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Total Paid</span>
                            <span className="text-slate-900 font-black text-sm">{rec.amountPaid?.toLocaleString()} {CURRENCY}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3">
                        {rec.status === 'Active' && (
                          <button onClick={() => exitParking(rec.id)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95">Checkout</button>
                        )}
                        <button onClick={() => deleteRecord(rec.id)} className="w-10 h-10 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><i className="fas fa-trash-alt"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-24 text-center">
                      <i className="fas fa-folder-open text-slate-100 text-6xl mb-4"></i>
                      <p className="text-slate-400 font-bold italic">No records found matching your query.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- ANALYTICS -------------------- */}
      {currentPage === Page.ANALYTICS && (
        <div className="space-y-8 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             {[
               { label: 'Live Active', val: records.filter(r => r.status === 'Active').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: 'fa-history' },
               { label: 'Free Space', val: slots.filter(s => s.status === SlotStatus.AVAILABLE).length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'fa-check-circle' },
               { label: 'Today Revenue', val: payments.reduce((a,b) => a+b.amountPaid, 0).toLocaleString() + ' ' + CURRENCY, color: 'text-indigo-900', bg: 'bg-slate-100', icon: 'fa-wallet' },
               { label: 'Fleet Count', val: cars.length, color: 'text-slate-800', bg: 'bg-slate-50', icon: 'fa-car' },
             ].map((card, i) => (
               <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <h5 className={`text-2xl font-black ${card.color}`}>{card.val}</h5>
                  </div>
                  <div className={`${card.bg} ${card.color} w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform`}><i className={`fas ${card.icon}`}></i></div>
               </div>
             ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 border-l-4 border-blue-600 pl-4">Revenue Growth</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                    <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', fontWeight: 'black' }} />
                    <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={5} dot={{ r: 6, fill: '#2563eb', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 9 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 border-l-4 border-emerald-500 pl-4">Popular Zones</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.slotUsage}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                    <XAxis dataKey="slot" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', fontWeight: 'black' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[10, 10, 0, 0]}>
                      {analyticsData.slotUsage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index < 3 ? '#1e40af' : '#cbd5e1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- PARKING SLOTS -------------------- */}
      {currentPage === Page.PARKING_SLOT && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-5 animate-in zoom-in duration-300">
          {slots.map(slot => {
            const activeRecord = records.find(r => r.slotNumber === slot.slotNumber && r.status === 'Active');
            return (
              <div key={slot.id} className={`p-5 rounded-3xl border-4 transition-all flex flex-col items-center gap-3 group relative overflow-hidden ${slot.status === SlotStatus.AVAILABLE ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-900 border-slate-800 text-white shadow-xl'}`}>
                <span className={`font-black text-xl tracking-tighter ${slot.status === SlotStatus.OCCUPIED ? 'text-blue-400' : 'text-emerald-900'}`}>{slot.slotNumber}</span>
                
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${slot.status === SlotStatus.AVAILABLE ? 'bg-white' : 'bg-slate-800'}`}>
                  <i className={`fas ${slot.status === SlotStatus.AVAILABLE ? 'fa-parking' : 'fa-car-side'}`}></i>
                </div>

                {slot.status === SlotStatus.OCCUPIED && activeRecord ? (
                  <div className="text-center w-full space-y-1 mt-1">
                    <p className="font-mono font-black text-[12px] uppercase leading-tight text-white tracking-widest">{activeRecord.plateNumber}</p>
                    <p className="text-[9px] font-bold uppercase text-slate-400 truncate w-full px-2" title={activeRecord.driverName}>{activeRecord.driverName}</p>
                  </div>
                ) : (
                  <div className="h-10 flex items-center">
                    <button onClick={() => setSelectedSlotForParking(slot)} className="text-[10px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg hover:bg-blue-600 transition-all active:scale-95">Assign</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* -------------------- OTHER PAGES -------------------- */}
      {currentPage === Page.PAYMENT && (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          <div className="bg-blue-700 p-10 text-white flex justify-between items-center">
             <div>
                <h3 className="text-4xl font-black mb-1">{payments.reduce((a,b) => a+b.amountPaid, 0).toLocaleString()} {CURRENCY}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Accumulated Collections</p>
             </div>
             <i className="fas fa-money-bill-transfer text-7xl opacity-10"></i>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest">
              <tr><th className="px-8 py-5">Transaction ID</th><th className="px-8 py-5">Date/Time</th><th className="px-8 py-5 text-right">Settled Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-800">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-6 font-mono font-black">{p.plateNumber}</td>
                  <td className="px-8 py-6 text-sm font-bold">{new Date(p.paymentDate).toLocaleString()}</td>
                  <td className="px-8 py-6 text-right font-black text-emerald-700 text-lg">{p.amountPaid.toLocaleString()} {CURRENCY}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {currentPage === Page.REPORTS && (
        <div className="bg-white p-12 rounded-3xl shadow-2xl border border-slate-200 print:shadow-none print:border-none">
          <div className="flex justify-between items-start mb-16 border-b-4 border-slate-900 pb-10">
            <div>
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">SmartPark</h2>
              <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] mt-2">PSSMS Official Financial Statement • Rubavu</p>
            </div>
            <div className="text-right">
              <span className="bg-slate-900 text-white px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 inline-block">Audit Report</span>
              <p className="text-sm font-black text-slate-900 mt-2">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}</p>
            </div>
          </div>
          <table className="w-full text-left border-collapse mb-16">
            <thead>
              <tr className="text-[11px] font-black uppercase text-slate-400 border-b">
                <th className="py-6 px-4">Vehicle Identity</th>
                <th className="py-6 px-4 text-center">Entry/Exit Logs</th>
                <th className="py-6 px-4 text-right">Settlement ({CURRENCY})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.filter(r => r.status === 'Completed').map(r => (
                <tr key={r.id} className="text-sm font-bold text-slate-800">
                  <td className="py-8 px-4">
                    <div className="flex flex-col">
                      <span className="font-mono font-black text-slate-900 text-lg">{r.plateNumber}</span>
                      <span className="text-[10px] text-slate-500 font-black uppercase">{r.driverName}</span>
                    </div>
                  </td>
                  <td className="py-8 px-4 text-center">
                    <div className="inline-flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                       <span className="text-xs font-black text-slate-700">{new Date(r.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       <i className="fas fa-arrow-right text-[10px] text-slate-300"></i>
                       <span className="text-xs font-black text-slate-700">{new Date(r.exitTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="py-8 px-4 text-right font-black text-slate-900 text-lg">{r.amountPaid?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white">
                <td colSpan={2} className="py-10 px-8 text-right text-[12px] uppercase font-black tracking-widest">Net Revenue Collected:</td>
                <td className="py-10 px-8 text-right text-4xl font-black">
                  {records.reduce((acc, r) => acc + (r.amountPaid || 0), 0).toLocaleString()} <span className="text-xs font-normal opacity-50">{CURRENCY}</span>
                </td>
              </tr>
            </tfoot>
          </table>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-12 py-5 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all shadow-2xl flex items-center gap-4 mx-auto print:hidden active:scale-95">
            <i className="fas fa-print text-xl"></i> Export Daily Ledger
          </button>
        </div>
      )}

      {/* -------------------- MODALS -------------------- */}
      {selectedCarForParking && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-lg flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full transform transition-all">
            <div className="text-center mb-10">
               <div className="bg-blue-600 w-24 h-24 rounded-3xl flex items-center justify-center text-white text-4xl mx-auto shadow-2xl mb-6"><i className="fas fa-map-marker-alt"></i></div>
               <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Choose Parking Slot</h3>
               <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">{selectedCarForParking.plateNumber} • {selectedCarForParking.driverName}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 max-h-72 overflow-y-auto p-1 custom-scrollbar">
              {slots.filter(s => s.status === SlotStatus.AVAILABLE).map(slot => (
                <button key={slot.id} onClick={() => startParking(selectedCarForParking.plateNumber, slot.id)} className="p-5 border-4 border-slate-50 rounded-2xl hover:border-blue-600 hover:bg-blue-50 transition-all text-center">
                  <span className="font-black text-slate-800 text-xl tracking-tighter">{slot.slotNumber}</span>
                </button>
              ))}
              {slots.filter(s => s.status === SlotStatus.AVAILABLE).length === 0 && (
                 <div className="col-span-3 py-10 text-center text-rose-600 font-black italic">The lot is currently at full capacity.</div>
              )}
            </div>
            <button onClick={() => setSelectedCarForParking(null)} className="w-full mt-10 py-5 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase text-xs tracking-[0.2em] hover:bg-rose-50 hover:text-rose-600 transition-all">Abort Action</button>
          </div>
        </div>
      )}

      {selectedSlotForParking && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-lg flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full transform transition-all">
            <div className="text-center mb-10">
               <div className="bg-emerald-600 w-24 h-24 rounded-3xl flex items-center justify-center text-white text-4xl mx-auto shadow-2xl mb-6"><i className="fas fa-car-side"></i></div>
               <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Vehicle Selection</h3>
               <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">Available for Slot {selectedSlotForParking.slotNumber}</p>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto p-1 custom-scrollbar">
              {cars.filter(car => !records.some(r => r.plateNumber === car.plateNumber && r.status === 'Active')).map(car => (
                <button key={car.plateNumber} onClick={() => startParking(car.plateNumber, selectedSlotForParking.id)} className="w-full p-6 border-4 border-slate-50 rounded-3xl hover:border-emerald-600 hover:bg-emerald-50 text-left flex justify-between items-center transition-all group">
                  <div>
                    <p className="font-black text-slate-900 text-xl tracking-tighter">{car.plateNumber}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{car.driverName}</p>
                  </div>
                  <div className="bg-emerald-100 text-emerald-600 w-10 h-10 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all"><i className="fas fa-arrow-right"></i></div>
                </button>
              ))}
              {cars.filter(car => !records.some(r => r.plateNumber === car.plateNumber && r.status === 'Active')).length === 0 && (
                <div className="py-12 text-center text-slate-300 font-bold italic">No un-parked vehicles registered in the system.</div>
              )}
            </div>
            <button onClick={() => setSelectedSlotForParking(null)} className="w-full mt-10 py-5 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase text-xs tracking-[0.2em] hover:bg-rose-50 hover:text-rose-600 transition-all">Cancel Assignment</button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;