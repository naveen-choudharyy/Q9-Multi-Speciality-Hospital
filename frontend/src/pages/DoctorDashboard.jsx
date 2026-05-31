import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  User,
  Clock,
  FileText,
  CheckCircle,
  Plus,
  Trash2,
  CalendarDays,
  Video,
  Settings,
  ShieldCheck,
  CreditCard,
  Filter,
  RefreshCw,
  TrendingUp,
  Sliders,
  DollarSign
} from 'lucide-react';
import api from '../services/api';
import VideoCallRoom from '../components/VideoCallRoom';
import useSEO from '../utils/useSEO';

export default function DoctorDashboard() {
  useSEO({
    title: 'Dr. Console & Shifts',
    description: 'Manage clinic shift rosters, set video consultation fees, track daily earnings, review patient booking queues, and initiate secure telemedicine calls.'
  });

  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();

  // Active view tab
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'roster' | 'settings'

  // Prescription builder state
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [medications, setMedications] = useState([]);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('Once a day');
  const [medDuration, setMedDuration] = useState('3 days');
  const [instructions, setInstructions] = useState('');

  // Scheduler slot state
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [schedulerMessage, setSchedulerMessage] = useState('');

  // Settings & Fees Edit State
  const [consultationFee, setConsultationFee] = useState(500);
  const [videoConsultationFee, setVideoConsultationFee] = useState(600);
  const [emergencyFee, setEmergencyFee] = useState(1000);
  const [availabilityStatus, setAvailabilityStatus] = useState('Available');
  const [settingsMessage, setSettingsMessage] = useState('');

  // Filter appointments by day (defaulting to empty/all, or specific date selected)
  const [filterDate, setFilterDate] = useState('');

  // Video call active state
  const [activeVideoCall, setActiveVideoCall] = useState(null);

  // Prescription modal state step
  const [prescriptionStep, setPrescriptionStep] = useState('edit'); // 'edit' | 'success'

  // Fetch appointments list
  const { data: appointmentsData, isLoading: isAppointmentsLoading } = useQuery({
    queryKey: ['doctorAppointments'],
    queryFn: async () => {
      const response = await api.get('/appointments');
      return response.data;
    },
    enabled: !!user
  });

  // Fetch doctor profile details (to get availability, fees, status)
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data;
    },
    enabled: !!user
  });

  // Initialize fees setting inputs on profile load
  useEffect(() => {
    if (profileData?.profile) {
      const p = profileData.profile;
      setConsultationFee(p.consultationFee || 500);
      setVideoConsultationFee(p.videoConsultationFee || 600);
      setEmergencyFee(p.emergencyFee || 1000);
      setAvailabilityStatus(p.availabilityStatus || 'Available');
    }
  }, [profileData]);

  // Update schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/doctors/schedule', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['doctorProfile']);
      setSchedulerMessage('Roster availability updated successfully!');
      setTimeout(() => setSchedulerMessage(''), 4000);
    }
  });

  // Update Profile details (fees & status)
  const updateProfileMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.put('/doctors/profile', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['doctorProfile']);
      queryClient.invalidateQueries(['doctorsList']);
      setSettingsMessage('Consultation fees updated successfully everywhere!');
      setTimeout(() => setSettingsMessage(''), 4000);
    }
  });

  // Complete consultation mutation (saves prescription implicitly in clinical history)
  const completeMutation = useMutation({
    mutationFn: async ({ appointmentId, status, medications, instructions }) => {
      const response = await api.patch(`/appointments/${appointmentId}`, { status, medications, instructions });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['doctorAppointments']);
      setPrescriptionStep('success');
    }
  });

  const handleClosePrescription = () => {
    setActiveAppointment(null);
    setMedications([]);
    setInstructions('');
    setMedName('');
    setMedDosage('');
    setPrescriptionStep('edit');
  };

  const addMedication = () => {
    if (!medName || !medDosage) return;
    setMedications((prev) => [
      ...prev,
      { name: medName, dosage: medDosage, frequency: medFrequency, duration: medDuration }
    ]);
    setMedName('');
    setMedDosage('');
  };

  const removeMedication = (idx) => {
    setMedications((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSchedule = (e) => {
    e.preventDefault();
    const currentSlots = profileData?.profile?.availabilitySlots || [];
    // Add new slot
    const updatedSlots = [...currentSlots, { dayOfWeek, startTime, endTime }];
    scheduleMutation.mutate({ availabilitySlots: updatedSlots });
  };

  const handleClearSchedule = () => {
    if (window.confirm("Are you sure you want to clear your availability schedule?")) {
      scheduleMutation.mutate({ availabilitySlots: [] });
    }
  };

  const handleUpdateSettings = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      consultationFee: Number(consultationFee),
      videoConsultationFee: Number(videoConsultationFee),
      emergencyFee: Number(emergencyFee),
      availabilityStatus
    });
  };

  const handleCompleteConsultation = (e) => {
    e.preventDefault();
    if (!activeAppointment) return;

    let finalMedications = [...medications];
    // Safeguard: If the doctor typed a medicine but forgot to click the "+" button, append it automatically
    if (medName.trim() && medDosage.trim()) {
      finalMedications.push({
        name: medName.trim(),
        dosage: medDosage.trim(),
        frequency: medFrequency,
        duration: medDuration
      });
    }

    completeMutation.mutate({
      appointmentId: activeAppointment._id,
      status: 'completed',
      medications: finalMedications,
      instructions
    });
  };

  if (isAppointmentsLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-semibold text-sm">Loading Doctor Console...</p>
      </div>
    );
  }

  const appointments = appointmentsData?.appointments || [];
  const schedule = profileData?.profile?.availabilitySlots || [];
  const doctorProfile = profileData?.profile || {};

  // Financial collection aggregates
  const completedAppointments = appointments.filter(a => a.status === 'completed');
  const totalCollections = completedAppointments.reduce((acc, curr) => acc + (curr.amountPaid || curr.doctorId?.consultationFee || 0), 0);

  // Day's patient booking filtering
  const filteredAppointments = filterDate
    ? appointments.filter(a => new Date(a.dateTime).toDateString() === new Date(filterDate).toDateString())
    : appointments;

  const scheduledCount = filteredAppointments.filter(a => a.status === 'scheduled').length;
  const completedCount = filteredAppointments.filter(a => a.status === 'completed').length;

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200/60 p-6 rounded-[2.2rem] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-650 bg-clip-text text-transparent">
              Doctor Practitioner Console
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Welcome, Dr. <span className="font-bold text-slate-800">{user?.name}</span> | Specialty: <span className="text-blue-600 font-bold">{doctorProfile.specialization || 'General Medicine'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
              availabilityStatus === 'Available'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : availabilityStatus === 'Busy'
                ? 'bg-yellow-50 text-yellow-600 border-yellow-100'
                : 'bg-red-50 text-red-650 border-red-100'
            }`}>
              Duty Status: {availabilityStatus}
            </span>
            <button
              onClick={() => setActiveTab('settings')}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full transition text-slate-500"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info widgets row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="bg-white border border-slate-200/60 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Shift Appointments</span>
              <p className="text-xl font-extrabold text-slate-800">{appointments.length} Booked</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-emerald-50 text-emerald-650 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Shift Earnings</span>
              <p className="text-xl font-extrabold text-emerald-600">₹{totalCollections}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-indigo-50 text-indigo-650 rounded-2xl">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Consultation Fee</span>
              <p className="text-xl font-extrabold text-slate-800">₹{consultationFee}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-violet-50 text-violet-650 rounded-2xl">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Availability Shifts</span>
              <p className="text-xl font-extrabold text-slate-800">{schedule.length} active slots</p>
            </div>
          </div>

        </div>

        {/* Split Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left panel: Quick navigation and actions */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-4 shadow-sm space-y-1.5">
              <button
                onClick={() => setActiveTab('queue')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition ${
                  activeTab === 'queue'
                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Appointments Queue</span>
              </button>
              <button
                onClick={() => setActiveTab('roster')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition ${
                  activeTab === 'roster'
                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>Roster Scheduler</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition ${
                  activeTab === 'settings'
                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Fees & Status</span>
              </button>
            </div>

            {/* Quick emergency notice */}
            <div className="bg-red-50 border border-red-100 p-5 rounded-[2rem] space-y-3">
              <h4 className="text-xs font-black text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-red-500 animate-pulse" />
                On-call Emergency Response
              </h4>
              <p className="text-[10px] text-red-650 leading-relaxed font-medium">
                Keep the console active. Patients booking under Emergency SOS consultation will bypass standard roster limits and show up instantly at the top of your scheduled queue.
              </p>
            </div>
          </div>

          {/* Right panel: Active tab content */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                
                {/* TAB 1: CONSULTATION QUEUE */}
                {activeTab === 'queue' && (
                  <div className="space-y-6">
                    
                    {/* Date filtering options */}
                    <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4.5 h-4.5 text-blue-600" />
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                          Filter Day's booking status
                        </h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="date"
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
                        />
                        {filterDate && (
                          <button
                            onClick={() => setFilterDate('')}
                            className="text-[10px] font-black text-red-500 uppercase tracking-wider hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Booking statuses breakdown */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm text-center">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Scheduled Consults</span>
                        <span className="text-xl font-extrabold text-blue-600">{scheduledCount} Active</span>
                      </div>
                      <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm text-center">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Completed Consults</span>
                        <span className="text-xl font-extrabold text-emerald-600">{completedCount} Finished</span>
                      </div>
                    </div>

                    {/* Main Appointments Queue */}
                    <div className="bg-white border border-slate-200/60 p-6 rounded-[2.5rem] shadow-sm space-y-6">
                      <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-4">
                        Today's Scheduled Consultations
                      </h3>

                      {filteredAppointments.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200/80">
                          <p className="text-slate-400 text-sm font-semibold">No appointments found matching this date.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredAppointments.map((apt) => (
                            <div
                              key={apt._id}
                              className={`p-5 border rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition ${
                                apt.status === 'scheduled'
                                  ? 'bg-white border-slate-200/60 hover:border-blue-200 shadow-sm'
                                  : 'bg-slate-50/50 border-slate-200/40 opacity-65'
                              }`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="text-base font-black text-slate-800">
                                    {apt.patientId?.userId?.name || 'Walk-in Patient'}
                                  </span>
                                  <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded font-black uppercase">
                                    {apt.patientId?.bloodGroup || 'O+'} Blood
                                  </span>
                                  {apt.consultationType && (
                                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold capitalize">
                                      Mode: {apt.consultationType}
                                    </span>
                                  )}
                                  {apt.amountPaid > 0 && (
                                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-black">
                                      Paid: ₹{apt.amountPaid}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 font-medium">
                                  Symptoms: <span className="text-slate-700 italic">"{apt.symptoms || 'General Check-up'}"</span>
                                </p>
                                <div className="text-[10px] text-slate-400 font-bold">
                                  Schedule: {new Date(apt.dateTime).toLocaleString()} | Queue Wait: #{apt.queueNumber}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                                <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                                  apt.status === 'scheduled'
                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                    : apt.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : 'bg-red-50 text-red-600 border-red-100'
                                }`}>
                                  {apt.status}
                                </span>

                                {apt.status === 'scheduled' && (
                                  <>
                                    {/* Video Call Button if Consultation Mode is Video */}
                                    {apt.consultationType === 'video' && (
                                      <button
                                        onClick={() => setActiveVideoCall(apt)}
                                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                                      >
                                        <Video className="w-3.5 h-3.5" />
                                        <span>Start Video Call</span>
                                      </button>
                                    )}

                                    <button
                                      onClick={() => {
                                        setActiveAppointment(apt);
                                        setPrescriptionStep('edit');
                                      }}
                                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      <span>Diagnose</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: ROSTER SCHEDULER */}
                {activeTab === 'roster' && (
                  <div className="bg-white border border-slate-200/60 p-6 lg:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-blue-500" />
                        Configure Roster Availability
                      </h3>
                      {schedule.length > 0 && (
                        <button
                          onClick={handleClearSchedule}
                          className="px-3 py-1.5 text-xs text-red-500 border border-red-100 rounded-xl hover:bg-red-50 font-bold transition"
                        >
                          Clear Schedule
                        </button>
                      )}
                    </div>

                    {schedule.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-500 italic">
                        No working roster shifts mapped. Patients cannot schedule appointments. Use the planner form below to register shift timings.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {schedule.map((sl, idx) => (
                          <div key={idx} className="bg-slate-50/50 border border-slate-200/65 p-3 rounded-2xl flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-700">{sl.dayOfWeek}</span>
                            <span className="text-blue-600 font-mono font-black">{sl.startTime} - {sl.endTime}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {schedulerMessage && (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs p-3 rounded-xl text-center font-bold">
                        {schedulerMessage}
                      </div>
                    )}

                    {/* Scheduler Add form */}
                    <form onSubmit={handleUpdateSchedule} className="space-y-4 pt-6 border-t border-slate-100">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Plan Working Shift</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Select Day</label>
                          <select
                            value={dayOfWeek}
                            onChange={(e) => setDayOfWeek(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                          >
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-455 mb-1.5 uppercase tracking-wider">Shift Start</label>
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-455 mb-1.5 uppercase tracking-wider">Shift End</label>
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow"
                      >
                        Publish Shift to Portal Roster
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 3: FEES & SETTINGS */}
                {activeTab === 'settings' && (
                  <div className="bg-white border border-slate-200/60 p-6 lg:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                    <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-4">
                      Roster Consultation Rates & Duty Status
                    </h3>

                    {settingsMessage && (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs p-3 rounded-xl text-center font-bold">
                        {settingsMessage}
                      </div>
                    )}

                    <form onSubmit={handleUpdateSettings} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                            Base Consultation Fee (₹ INR)
                          </label>
                          <input
                            type="number"
                            value={consultationFee}
                            onChange={(e) => setConsultationFee(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                            Video Teleconsultation Fee (₹ INR)
                          </label>
                          <input
                            type="number"
                            value={videoConsultationFee}
                            onChange={(e) => setVideoConsultationFee(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                            Emergency Consultation Fee (₹ INR)
                          </label>
                          <input
                            type="number"
                            value={emergencyFee}
                            onChange={(e) => setEmergencyFee(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                            Duty Availability Status
                          </label>
                          <select
                            value={availabilityStatus}
                            onChange={(e) => setAvailabilityStatus(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold focus:outline-none"
                          >
                            <option value="Available">Available (Accepting appointments)</option>
                            <option value="Busy">Busy (Roster full / Urgent cases only)</option>
                            <option value="On Leave">On Leave (Booking slots locked)</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
                      >
                        {updateProfileMutation.isPending ? 'Syncing profiles...' : 'Update Consultation Rates Everywhere'}
                      </button>
                    </form>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* Diagnosis & Prescription Builder Modal */}
      <AnimatePresence>
        {activeAppointment && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200/60 p-6 rounded-[2.5rem] max-w-2xl w-full text-slate-800 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl"
            >
              {prescriptionStep === 'edit' ? (
                <>
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Diagnosis & Prescription Builder
                    </h3>
                    <button 
                      onClick={() => setActiveAppointment(null)}
                      className="text-slate-400 hover:text-slate-600 transition font-black cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Patient Information</h4>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">
                      Name: {activeAppointment.patientId?.userId?.name} | Phone: {activeAppointment.patientId?.userId?.phone}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                      <strong>Stated Symptoms:</strong> {activeAppointment.symptoms}
                    </p>
                  </div>

                  {/* Medication Builder Form */}
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ADD MEDICATION Rx</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-slate-50 border border-slate-200/50 p-4 rounded-2xl">
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">NAME</label>
                        <input 
                          type="text" value={medName} onChange={(e) => setMedName(e.target.value)}
                          placeholder="Paracetamol 500mg"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">DOSAGE</label>
                        <input 
                          type="text" value={medDosage} onChange={(e) => setMedDosage(e.target.value)}
                          placeholder="1 Tablet"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">FREQUENCY</label>
                        <select 
                          value={medFrequency} onChange={(e) => setMedFrequency(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                        >
                          <option value="Once a day">Once a day</option>
                          <option value="Twice a day (morning / night)">Twice a day</option>
                          <option value="Thrice a day">Thrice a day</option>
                          <option value="As needed (SOS)">As needed</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex space-x-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">DURATION</label>
                          <input 
                            type="text" value={medDuration} onChange={(e) => setMedDuration(e.target.value)}
                            placeholder="3 days"
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={addMedication}
                          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition flex items-center justify-center cursor-pointer shadow"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Display added medicines */}
                    {medications.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] font-bold text-slate-400">MEDICATIONS LIST:</span>
                        {medications.map((m, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white border border-slate-200/50 p-3 rounded-xl text-xs font-medium">
                            <div>
                              <strong className="text-slate-800 font-extrabold">{m.name}</strong> - {m.dosage} | {m.frequency} | {m.duration}
                            </div>
                            <button 
                              onClick={() => removeMedication(idx)}
                              className="text-red-500 hover:text-red-655 transition cursor-pointer p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Instructions and complete button */}
                  <form onSubmit={handleCompleteConsultation} className="space-y-4 border-t border-slate-100 pt-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">SPECIAL INSTRUCTIONS / CLINICAL REMARKS</label>
                      <textarea
                        rows="3"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Take medicine after food. Complete bed rest for 3 days."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:outline-none placeholder-slate-400 resize-none"
                      ></textarea>
                    </div>

                    <div className="flex space-x-3 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveAppointment(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Cancel Diagnosis
                      </button>
                      <button
                        type="submit"
                        disabled={completeMutation.isPending}
                        className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
                      >
                        {completeMutation.isPending ? 'Saving Record...' : 'Complete & Generate Prescription'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="space-y-6 text-slate-800">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900">
                      Prescription Generated!
                    </h3>
                    <p className="text-xs text-slate-500">
                      The clinical consultation checklist has been verified and shared with the patient.
                    </p>
                  </div>

                  {/* Printable prescription card */}
                  <div id="printable-prescription" className="bg-slate-50/70 border border-slate-200/80 p-6 rounded-3xl space-y-5 text-xs shadow-inner">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                      <div>
                        <h4 className="font-extrabold text-blue-600 text-sm uppercase tracking-wide">Q9 Multi-Specialty Hospital</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Clinical Telehealth Services</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Date Issued</span>
                        <span className="font-black text-slate-700">{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Practitioner Details</span>
                        <strong className="text-slate-800 font-black text-sm">Dr. {user?.name}</strong>
                        <span className="block text-[10px] text-slate-500 font-semibold">{doctorProfile.specialization || 'Clinical Specialist'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Patient Details</span>
                        <strong className="text-slate-800 font-black text-sm">{activeAppointment.patientId?.userId?.name || 'Walk-in Patient'}</strong>
                        <span className="block text-[10px] text-slate-500 font-semibold">Blood Group: {activeAppointment.patientId?.bloodGroup || 'O+'}</span>
                      </div>
                    </div>

                    {/* Rx Medicines list */}
                    <div className="space-y-3.5">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Prescribed Medications (Rx)</span>
                      {medications.length === 0 ? (
                        <p className="text-slate-400 italic">No medications prescribed on this summary sheet.</p>
                      ) : (
                        <div className="space-y-2">
                          {medications.map((m, idx) => (
                            <div key={idx} className="bg-white border border-slate-200/50 px-4 py-3 rounded-2xl flex justify-between items-center shadow-sm">
                              <div>
                                <strong className="text-slate-800 font-extrabold text-sm">{m.name}</strong>
                                <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">{m.frequency} | Duration: {m.duration}</span>
                              </div>
                              <span className="text-blue-600 font-black text-xs bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100">{m.dosage}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {instructions && (
                      <div className="border-t border-slate-200 pt-3">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider mb-1">Clinical Remarks & Instructions</span>
                        <p className="text-slate-650 italic font-semibold leading-relaxed p-3 bg-white border border-slate-100 rounded-xl">
                          "{instructions}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 justify-end border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        const printWindow = window.open('', '_blank', 'width=800,height=600');
                        const printContents = document.getElementById('printable-prescription').innerHTML;
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Prescription - Dr. ${user?.name}</title>
                              <style>
                                body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                                .uppercase { text-transform: uppercase; }
                                .font-extrabold { font-weight: 800; }
                                .font-black { font-weight: 900; }
                                .font-bold { font-weight: 700; }
                                .font-semibold { font-weight: 600; }
                                .font-medium { font-weight: 500; }
                                .text-sm { font-size: 14px; }
                                .text-xs { font-size: 12px; }
                                .text-right { text-align: right; }
                                .flex { display: flex; }
                                .justify-between { justify-content: space-between; }
                                .items-start { align-items: flex-start; }
                                .items-center { align-items: center; }
                                .grid { display: grid; }
                                .grid-cols-2 { grid-template-columns: 1fr 1fr; }
                                .gap-4 { gap: 16px; }
                                .space-y-5 > * + * { margin-top: 20px; }
                                .space-y-4 > * + * { margin-top: 16px; }
                                .space-y-2 > * + * { margin-top: 8px; }
                                .space-y-1.5 > * + * { margin-top: 6px; }
                                .border-b { border-bottom: 1px solid #e2e8f0; }
                                .border-t { border-top: 1px solid #e2e8f0; }
                                .pb-3 { padding-bottom: 12px; }
                                .pt-3 { padding-top: 12px; }
                                .bg-slate-50 { background-color: #f8fafc; }
                                .bg-white { background-color: #ffffff; }
                                .border { border: 1px solid #e2e8f0; }
                                .rounded-2xl { border-radius: 16px; }
                                .rounded-3xl { border-radius: 24px; }
                                .rounded-xl { border-radius: 12px; }
                                .p-6 { padding: 24px; }
                                .p-3 { padding: 12px; }
                                .px-3 { padding-left: 12px; padding-right: 12px; }
                                .py-1.5 { padding-top: 6px; padding-bottom: 6px; }
                                .block { display: block; }
                                .italic { font-style: italic; }
                                .text-blue-600 { color: #2563eb; }
                                .text-slate-400 { color: #94a3b8; }
                                .text-slate-500 { color: #64748b; }
                                .text-slate-700 { color: #334155; }
                                .text-slate-800 { color: #1e293b; }
                                .bg-blue-50\\/50 { background-color: rgba(37, 99, 235, 0.05); }
                              </style>
                            </head>
                            <body>
                              ${printContents}
                              <script>
                                window.onload = function() {
                                  window.print();
                                  window.close();
                                }
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }}
                      className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Print Prescription</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClosePrescription}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-855 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Call Room Overlay */}
      {activeVideoCall && (
        <VideoCallRoom
          isOpen={!!activeVideoCall}
          onClose={() => setActiveVideoCall(null)}
          channelName={`Appointment_${activeVideoCall._id}`}
          userName={`Dr. ${user?.name}`}
          userRole="Doctor"
        />
      )}

    </div>
  );
}
