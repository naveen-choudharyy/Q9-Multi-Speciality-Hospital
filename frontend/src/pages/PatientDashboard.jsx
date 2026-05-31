import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  User,
  Activity,
  Clock,
  FileText,
  Send,
  AlertTriangle,
  Eye,
  CheckCircle,
  MessageSquare,
  LogOut,
  Home,
  Plus,
  Sparkles,
  Stethoscope,
  Pill,
  ArrowRight,
  Phone,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldAlert,
  Video
} from 'lucide-react';
import api from '../services/api';
import { logout } from '../store/authSlice';
import PaymentModal from '../components/PaymentModal';
import VideoCallRoom from '../components/VideoCallRoom';
import useSEO from '../utils/useSEO';

export default function PatientDashboard() {
  useSEO({
    title: 'My Patient Dashboard',
    description: 'Access clinical treatment summaries, scheduled consult timings, active medical prescriptions, and run real-time AI disease predictors.'
  });

  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  // Active Tab
  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'book' | 'ai' | 'profile'

  // Video call state
  const [activeVideoCall, setActiveVideoCall] = useState(null);

  // Selected prescription state for modal details view
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  // Booking Form States
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [consultationType, setConsultationType] = useState('in-person'); // 'in-person' | 'video' | 'emergency'
  const [bookingSymptoms, setBookingSymptoms] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');

  // AI Symptom Predictor States
  const [aiSymptoms, setAiSymptoms] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Profile Form States
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileBloodGroup, setProfileBloodGroup] = useState('O+');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [coverageLimit, setCoverageLimit] = useState(0);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Add Medical History Item States
  const [newCondition, setNewCondition] = useState('');
  const [newConditionStatus, setNewConditionStatus] = useState('active');

  // General Messages
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [historyMsg, setHistoryMsg] = useState({ type: '', text: '' });

  // Fetch Patient Timeline (appointments, profile data, prescriptions, reports)
  const { data: timelineData, isLoading: isTimelineLoading, refetch: refetchTimeline } = useQuery({
    queryKey: ['patientTimeline'],
    queryFn: async () => {
      const response = await api.get('/patients/timeline');
      return response.data;
    },
    enabled: !!user
  });

  // Fetch Doctors for Booking
  const { data: doctorsData, isLoading: isDoctorsLoading } = useQuery({
    queryKey: ['doctorsList'],
    queryFn: async () => {
      const response = await api.get('/doctors');
      return response.data;
    }
  });

  // Load Patient Profile form values on data fetch
  useEffect(() => {
    if (timelineData?.patient) {
      const p = timelineData.patient;
      setProfileBloodGroup(p.bloodGroup || 'O+');
      setInsuranceProvider(p.insurance?.provider || '');
      setPolicyNumber(p.insurance?.policyNumber || '');
      setCoverageLimit(p.insurance?.coverageLimit || 0);
      setEmergencyName(p.emergencyContact?.name || '');
      setEmergencyRelationship(p.emergencyContact?.relationship || '');
      setEmergencyPhone(p.emergencyContact?.phone || '');
    }
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
    }
  }, [timelineData, user]);

  // Fetch AI Prediction History
  const fetchPredictionHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await api.get('/ml/symptoms/history');
      if (response.data.success) {
        setPredictionHistory(response.data.history);
      }
    } catch (err) {
      console.error('Error fetching prediction history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch predictions list when changing to AI tab
  useEffect(() => {
    if (activeTab === 'ai') {
      fetchPredictionHistory();
    }
  }, [activeTab]);

  // Handle Logout
  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  // Profile Submit handler
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    try {
      const response = await api.put('/patients/profile', {
        name: profileName,
        phone: profilePhone,
        bloodGroup: profileBloodGroup,
        insurance: {
          provider: insuranceProvider,
          policyNumber: policyNumber,
          coverageLimit: Number(coverageLimit)
        },
        emergencyContact: {
          name: emergencyName,
          relationship: emergencyRelationship,
          phone: emergencyPhone
        }
      });

      if (response.data.success) {
        setProfileMsg({ type: 'success', text: 'Health profile updated successfully!' });
        queryClient.invalidateQueries(['patientTimeline']);
        setTimeout(() => setProfileMsg({ type: '', text: '' }), 4000);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
    }
  };

  // Add Medical Condition handler
  const handleAddCondition = async (e) => {
    e.preventDefault();
    if (!newCondition.trim()) return;
    setHistoryMsg({ type: '', text: '' });

    try {
      const response = await api.post('/patients/history', {
        condition: newCondition,
        status: newConditionStatus
      });

      if (response.data.success) {
        setHistoryMsg({ type: 'success', text: `Added "${newCondition}" to medical records.` });
        setNewCondition('');
        queryClient.invalidateQueries(['patientTimeline']);
        setTimeout(() => setHistoryMsg({ type: '', text: '' }), 4000);
      }
    } catch (err) {
      console.error('Error adding condition:', err);
      setHistoryMsg({ type: 'error', text: 'Failed to update treatment history.' });
    }
  };

  // Trigger Booking Payment Flow
  const handleBookConsultationClick = (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !appointmentDate || !bookingSymptoms) {
      alert('Please fill out all slots details, schedule date/time and symptom description.');
      return;
    }
    setShowPaymentModal(true);
  };

  // Triggered on Successful Payment Verification
  const handlePaymentSuccess = ({ invoiceData }) => {
    setShowPaymentModal(false);
    queryClient.invalidateQueries(['patientTimeline']);
    setBookingSuccess(`Payment verified & Consultation Confirmed! Invoice ID: ${invoiceData.invoiceNumber}`);

    // Clear form states
    setSelectedDoctorId('');
    setAppointmentDate('');
    setBookingSymptoms('');
    setConsultationType('in-person');

    // Switch to Overview Tab to view scheduled slot
    setTimeout(() => {
      setBookingSuccess('');
      setActiveTab('records');
    }, 4500);
  };

  // AI disease prediction request
  const handleAiPrediction = async (e) => {
    e.preventDefault();
    if (!aiSymptoms.trim()) return;
    setAiLoading(true);
    setPredictionResult(null);

    try {
      const response = await api.post('/ml/symptoms/predict', {
        symptoms: aiSymptoms
      });

      if (response.data.success) {
        setPredictionResult(response.data.prediction);
        setAiSymptoms('');
        fetchPredictionHistory();
      }
    } catch (err) {
      console.error('AI Predict Error:', err);
      alert('AI Symptom Evaluator service is temporarily busy. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  if (isTimelineLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-semibold text-sm">Synchronizing Patient Portal...</p>
      </div>
    );
  }

  const patient = timelineData?.patient || {};
  const appointments = timelineData?.appointments || [];
  const prescriptions = timelineData?.prescriptions || [];
  const reports = timelineData?.labReports || [];
  const doctors = doctorsData?.doctors || [];

  // Filter doctors by selected specialty if any
  const uniqueSpecialties = Array.from(new Set(doctors.map(d => d.specialization)));
  const filteredDoctors = selectedSpecialty
    ? doctors.filter(d => d.specialization === selectedSpecialty)
    : doctors;

  // Selected Doctor object
  const currentSelectedDoctor = doctors.find(d => d._id === selectedDoctorId);

  // Billing math for booking preview
  const getBookingBilling = () => {
    if (!currentSelectedDoctor) return { base: 0, surcharge: 0, tax: 0, total: 0 };
    const baseFee = currentSelectedDoctor.consultationFee;
    let surcharge = 0;
    if (consultationType === 'video') surcharge = Math.round(baseFee * 0.2); // +20% for teleconsultation
    if (consultationType === 'emergency') surcharge = baseFee; // +100% emergency premium
    const subtotal = baseFee + surcharge;
    const tax = Math.round(subtotal * 0.18); // 18% GST
    const total = subtotal + tax;
    return { base: baseFee, surcharge, tax, total };
  };

  const billDetails = getBookingBilling();

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <img
              src="https://res.cloudinary.com/dgcyqntse/image/upload/v1773725210/1000572077-removebg-preview_o0stug.png"
              alt="Hospital Logo"
              className="w-10 h-10 object-contain"
            />
            <div className="leading-tight">
              <h1 className="text-xs font-black text-slate-900 uppercase tracking-wider">Q9 Multi-Specialty</h1>
              <p className="text-[10px] text-blue-600 font-bold uppercase">Hospital Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-full">
              Patient: <span className="font-bold text-slate-700">{user?.name}</span>
            </span>
            <button
              onClick={() => navigate('/')}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition"
              title="Home"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        
        {/* Main Grid */}
        <div className="lg:grid lg:grid-cols-4 gap-8 items-start">
          
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-6 mb-8 lg:mb-0">
            {/* Quick Profile Summary Card */}
            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{user?.name}</h4>
                  <p className="text-[11px] text-slate-500 truncate max-w-[150px]">{user?.email}</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Blood Type</span>
                  <span className="text-sm font-extrabold text-blue-600">{patient.bloodGroup || 'O+'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Consults</span>
                  <span className="text-sm font-extrabold text-indigo-600">{appointments.length}</span>
                </div>
              </div>

              {/* Emergency Hotline Button */}
              <div className="mt-6">
                <a
                  href="tel:+919257540743"
                  className="w-full py-3 bg-red-500 hover:bg-red-650 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-red-500/10 hover:shadow-red-500/20"
                >
                  <AlertTriangle className="w-4 h-4 animate-bounce" />
                  <span>EMERGENCY SOS CALL</span>
                </a>
              </div>
            </div>

            {/* Sidebar Buttons */}
            <div className="bg-white border border-slate-200/60 rounded-[2.2rem] p-4 shadow-sm space-y-1.5">
              {[
                { id: 'records', label: 'Overview & Records', icon: Calendar },
                { id: 'book', label: 'Book Consultation', icon: Stethoscope },
                { id: 'ai', label: 'AI Disease Predictor', icon: Sparkles },
                { id: 'profile', label: 'My Health Profile', icon: User }
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold transition duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-blue-50/80 text-blue-600 border-l-4 border-blue-600 shadow-sm shadow-blue-500/5'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Content Panel */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                
                {/* 1. TABS: OVERVIEW & RECORDS */}
                {activeTab === 'records' && (
                  <div className="space-y-8">
                    
                    {/* Welcome Banner */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1.5 z-10">
                        <h2 className="text-xl font-extrabold text-blue-900">Medical Summary Center</h2>
                        <p className="text-xs text-blue-700 max-w-xl">
                          Review upcoming consultations, read detailed OCR lab assessments, and manage your treatment guidelines.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('book')}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold transition shadow-md shadow-blue-600/10 flex items-center gap-1.5 z-10"
                      >
                        <Plus className="w-4 h-4" />
                        Book Appointment
                      </button>
                      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                        <Activity className="w-48 h-48 text-blue-600" />
                      </div>
                    </div>

                    {/* Stats Widget cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white border border-slate-200/60 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                        <div className="p-3.5 bg-blue-50 text-blue-500 rounded-2xl">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Next Consult</span>
                          <p className="text-sm font-extrabold text-slate-800">
                            {appointments.filter(a => a.status === 'scheduled').length > 0
                              ? new Date(appointments.find(a => a.status === 'scheduled').dateTime).toLocaleDateString()
                              : 'No Active Slots'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/60 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                        <div className="p-3.5 bg-emerald-50 text-emerald-500 rounded-2xl">
                          <Pill className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Active Prescriptions</span>
                          <p className="text-sm font-extrabold text-slate-800">{prescriptions.length} Guidelines</p>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/60 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                        <div className="p-3.5 bg-indigo-50 text-indigo-500 rounded-2xl">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Diagnostic Records</span>
                          <p className="text-sm font-extrabold text-slate-800">{reports.length} Uploaded Reports</p>
                        </div>
                      </div>
                    </div>

                    {/* Consultations List */}
                    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm space-y-6">
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Consultation Appointments
                      </h3>

                      {appointments.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200/80">
                          <p className="text-slate-400 text-sm font-medium">No scheduled consultations or prior visits found.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {appointments.map((apt) => (
                            <div
                              key={apt._id}
                              className="p-4 border border-slate-200/50 hover:border-blue-100 hover:bg-blue-50/10 rounded-2xl transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2.5">
                                  <h4 className="font-extrabold text-slate-800 text-sm">
                                    Dr. {apt.doctorId?.userId?.name || 'Assigned Specialist'}
                                  </h4>
                                  <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded font-black uppercase">
                                    {apt.doctorId?.specialization || 'Clinical Specialist'}
                                  </span>
                                  {apt.consultationType && (
                                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold capitalize">
                                      {apt.consultationType}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                  Symptoms: <span className="text-slate-700 italic">"{apt.symptoms}"</span>
                                </p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-[10px] text-slate-400">
                                  <span>Date: <span className="text-slate-600 font-bold">{new Date(apt.dateTime).toLocaleDateString()}</span></span>
                                  <span>Time: <span className="text-slate-600 font-bold">{new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
                                  {apt.amountPaid > 0 && (
                                    <span className="text-emerald-600 font-bold">Paid: ₹{apt.amountPaid}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 gap-3">
                                <span
                                  className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                    apt.status === 'scheduled'
                                      ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                      : apt.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                      : 'bg-red-50 text-red-600 border border-red-100'
                                  }`}
                                >
                                  {apt.status}
                                </span>

                                {apt.status === 'scheduled' && (
                                  <div className="text-[10px] text-slate-500 text-right space-y-1.5 flex flex-col items-end">
                                    <div>
                                      Queue: <span className="text-blue-600 font-extrabold">#{apt.queueNumber || 1}</span>
                                      <span className="mx-1">|</span>
                                      Wait: <span className="text-blue-600 font-extrabold">~{apt.predictedWaitTime || 15} mins</span>
                                    </div>
                                    {apt.consultationType === 'video' && (
                                      <button
                                        onClick={() => setActiveVideoCall(apt)}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow flex items-center gap-1 cursor-pointer"
                                      >
                                        <Video className="w-3.5 h-3.5" />
                                        <span>Join Video Call</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Prescriptions & Medical Instructions */}
                    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm space-y-6">
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Pill className="w-5 h-5 text-emerald-500" />
                        Prescribed Medications
                      </h3>

                      {prescriptions.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200/80">
                          <p className="text-slate-400 text-sm font-medium">No medical prescriptions issued on this portal.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {prescriptions.map((p) => (
                            <div key={p._id} className="p-5 border border-slate-200/60 rounded-2xl space-y-4 hover:shadow-sm transition bg-slate-50/30">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-extrabold text-slate-800 text-sm">
                                    Dr. {p.doctorId?.userId?.name || 'Assigned Specialist'}
                                  </h4>
                                  <span className="text-[9px] text-slate-400 block font-bold">
                                    Issued: {new Date(p.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-extrabold font-mono uppercase">
                                  Rx Active
                                </span>
                              </div>

                              <div className="space-y-2 border-t border-slate-100 pt-3">
                                {p.medications && p.medications.map((med, i) => (
                                  <div key={i} className="text-xs bg-white border border-slate-100 p-2.5 rounded-xl space-y-1">
                                    <div className="flex justify-between">
                                      <span className="font-extrabold text-slate-700">{med.name}</span>
                                      <span className="font-semibold text-blue-600">{med.dosage}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                      <span>Frequency: {med.frequency}</span>
                                      <span>Duration: {med.duration}</span>
                                    </div>
                                    {med.instructions && (
                                      <p className="text-[10px] text-slate-400 italic mt-0.5">Note: "{med.instructions}"</p>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <div className="flex justify-end pt-3 border-t border-slate-100 mt-3">
                                <button
                                  onClick={() => setSelectedPrescription(p)}
                                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow shadow-blue-500/5"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Open Prescription</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Diagnostic Lab Reports */}
                    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm space-y-6">
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        Diagnostic lab Reports
                      </h3>

                      {reports.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200/80">
                          <p className="text-slate-400 text-sm font-medium">No diagnostic reports uploaded yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {reports.map((rep) => (
                            <div key={rep._id} className="bg-white border border-slate-200/60 p-5 rounded-2xl space-y-3.5 shadow-sm hover:border-slate-300 transition">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-sm font-black text-slate-800">{rep.testName}</h4>
                                  <span className="text-[10px] text-slate-400 block font-bold">{new Date(rep.createdAt).toLocaleDateString()}</span>
                                </div>
                                <span
                                  className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                                    rep.severity === 'normal'
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                      : rep.severity === 'abnormal'
                                      ? 'bg-yellow-50 text-yellow-600 border-yellow-100'
                                      : 'bg-red-50 text-red-600 border-red-100'
                                  }`}
                                >
                                  {rep.severity}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-100 p-2.5 rounded-xl line-clamp-2">
                                "{rep.ocrAnalysis?.summary || 'Report details parsed successfully.'}"
                              </p>

                              {rep.ocrAnalysis?.abnormalValues?.length > 0 && (
                                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                  <span className="text-[10px] font-black text-red-500 uppercase tracking-wide flex items-center gap-1">
                                    <ShieldAlert className="w-3.5 h-3.5" /> Flagged Outliers
                                  </span>
                                  {rep.ocrAnalysis.abnormalValues.map((ab, idx) => (
                                    <div key={idx} className="flex justify-between text-xs bg-red-50/30 border border-red-100/50 p-2 rounded-xl">
                                      <span className="text-slate-600 font-bold">{ab.parameter}</span>
                                      <span className="text-red-500 font-extrabold font-mono">{ab.value} ({ab.referenceRange})</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <a
                                href={rep.reportUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1.5 pt-2"
                              >
                                <Eye className="w-4 h-4" />
                                <span>View Document PDF</span>
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. TABS: BOOK CONSULTATION */}
                {activeTab === 'book' && (
                  <div className="space-y-8">
                    
                    {/* Booking Form Card */}
                    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 lg:p-8 shadow-sm">
                      <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                        Schedule Doctor Consultation
                      </h3>
                      <p className="text-slate-500 text-xs mb-6 border-b border-slate-100 pb-4">
                        Choose specialties, verify doctor slot rates, and secure booking checkouts with invoice billing.
                      </p>

                      {bookingSuccess && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm p-4 rounded-2xl mb-6 text-center font-bold flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <span>{bookingSuccess}</span>
                        </motion.div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        
                        {/* Booking inputs form (3 of 5 cols) */}
                        <form onSubmit={handleBookConsultationClick} className="lg:col-span-3 space-y-5">
                          
                          {/* Specialty Selection */}
                          <div>
                            <label className="block text-[11px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                              1. Select Specialty
                            </label>
                            <select
                              value={selectedSpecialty}
                              onChange={(e) => {
                                setSelectedSpecialty(e.target.value);
                                setSelectedDoctorId(''); // reset doctor select
                              }}
                              className="w-full bg-white border border-slate-200 hover:border-slate-350 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition duration-200 font-medium"
                            >
                              <option value="">-- View All Specialties --</option>
                              {uniqueSpecialties.map((spec, idx) => (
                                <option key={idx} value={spec}>
                                  {spec}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Doctor Selection */}
                          <div>
                            <label className="block text-[11px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                              2. Choose Medical Specialist
                            </label>
                            {isDoctorsLoading ? (
                              <div className="text-xs text-slate-400 flex items-center gap-1.5 py-2">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching practitioners list...
                              </div>
                            ) : (
                              <select
                                value={selectedDoctorId}
                                onChange={(e) => setSelectedDoctorId(e.target.value)}
                                className="w-full bg-white border border-slate-200 hover:border-slate-350 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition duration-200 font-medium"
                              >
                                <option value="">-- Choose Practitioner --</option>
                                {filteredDoctors.map((doc) => (
                                  <option key={doc._id} value={doc._id}>
                                    Dr. {doc.userId?.name} ({doc.specialization}) — Rate: ₹{doc.consultationFee}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Consultation Type Selection */}
                          <div>
                            <label className="block text-[11px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                              3. Choose Consultation Mode
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { id: 'in-person', label: 'In-Person Visit', info: 'Regular Rate' },
                                { id: 'video', label: 'Telehealth Call', info: '+20% premium' },
                                { id: 'emergency', label: 'Emergency SOS', info: '+100% premium' }
                              ].map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setConsultationType(t.id)}
                                  className={`p-3 border rounded-2xl text-center transition cursor-pointer ${
                                    consultationType === t.id
                                      ? 'bg-blue-50 border-blue-600 text-blue-600 shadow-sm'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="block text-xs font-bold">{t.label}</span>
                                  <span className="block text-[9px] text-slate-400 font-medium mt-0.5">{t.info}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Appointment Date/Time */}
                          <div>
                            <label className="block text-[11px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                              4. Appointment Schedule Date/Time
                            </label>
                            <input
                              type="datetime-local"
                              value={appointmentDate}
                              onChange={(e) => setAppointmentDate(e.target.value)}
                              className="w-full bg-white border border-slate-200 hover:border-slate-350 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition duration-200 font-medium"
                            />
                          </div>

                          {/* Symptoms Field */}
                          <div>
                            <label className="block text-[11px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                              5. Symptom descriptor details
                            </label>
                            <textarea
                              rows="3"
                              value={bookingSymptoms}
                              onChange={(e) => setBookingSymptoms(e.target.value)}
                              placeholder="Please describe symptoms briefly (e.g., headache for 3 days, low temperature)"
                              className="w-full bg-white border border-slate-200 hover:border-slate-350 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition duration-200 font-medium placeholder-slate-400 resize-none"
                            ></textarea>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                          >
                            <span>Proceed to Payment Checkout</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </form>

                        {/* Cost & Doctor preview panel (2 of 5 cols) */}
                        <div className="lg:col-span-2 space-y-6">
                          
                          {/* Selected Doctor Avatar Card */}
                          <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-3xl space-y-4">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Practitioner profile</h4>
                            {currentSelectedDoctor ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">
                                    Dr.
                                  </div>
                                  <div>
                                    <h5 className="font-extrabold text-slate-800 text-sm">
                                      Dr. {currentSelectedDoctor.userId?.name}
                                    </h5>
                                    <p className="text-[10px] text-slate-500 font-bold">{currentSelectedDoctor.specialization}</p>
                                  </div>
                                </div>

                                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/50 font-medium">
                                  <div className="flex justify-between">
                                    <span>Experience:</span>
                                    <span className="font-bold text-slate-800">{currentSelectedDoctor.experience || 8} Years</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Availability:</span>
                                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                                      {currentSelectedDoctor.availabilityStatus || 'Available'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Consulting Rate:</span>
                                    <span className="font-bold text-slate-800">₹{currentSelectedDoctor.consultationFee}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No specialist chosen yet.</p>
                            )}
                          </div>

                          {/* Payment Pricing Breakdown */}
                          <div className="bg-white border border-slate-200/60 p-5 rounded-3xl space-y-4 shadow-sm">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Pricing Breakdown</h4>
                            
                            <div className="space-y-2.5 text-xs border-b border-slate-100 pb-3 font-medium">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Base Consultation Fee:</span>
                                <span className="text-slate-800 font-bold">₹{billDetails.base}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Mode Surcharge:</span>
                                <span className="text-slate-800 font-bold">+ ₹{billDetails.surcharge}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">GST (18% Goods & Services Tax):</span>
                                <span className="text-slate-800 font-bold">₹{billDetails.tax}</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                              <span className="font-black text-slate-800 uppercase tracking-wide">Total Payable:</span>
                              <span className="text-base font-black text-blue-600">₹{billDetails.total}</span>
                            </div>
                          </div>

                          {/* Quick Checkout security notice */}
                          <div className="bg-slate-50 border border-slate-200/30 p-4 rounded-2xl flex gap-3 items-start">
                            <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                              Booking is secured by Razorpay transactional protocols. Automatic GST receipt and PDF clinical slips are generated upon verification.
                            </p>
                          </div>

                        </div>
                      </div>

                    </div>

                    {/* Payment Modal Mount */}
                    {currentSelectedDoctor && (
                      <PaymentModal
                        isOpen={showPaymentModal}
                        onClose={() => setShowPaymentModal(false)}
                        onSuccess={handlePaymentSuccess}
                        doctor={currentSelectedDoctor}
                        appointmentDate={appointmentDate}
                        symptoms={bookingSymptoms}
                        consultationType={consultationType}
                      />
                    )}

                  </div>
                )}

                {/* 3. TABS: AI DISEASE PREDICTOR */}
                {activeTab === 'ai' && (
                  <div className="space-y-8">
                    
                    {/* Tool Summary */}
                    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1.5 z-10">
                        <h2 className="text-xl font-extrabold text-violet-900 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-violet-600 animate-pulse" />
                          AI-Powered Diagnostic Assessor
                        </h2>
                        <p className="text-xs text-violet-750 max-w-xl">
                          Input your active symptoms. The diagnostic agent will factor in your treatment history list to generate a clinically structured risk evaluation.
                        </p>
                      </div>
                      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                        <Sparkles className="w-48 h-48 text-violet-500" />
                      </div>
                    </div>

                    {/* Diagnostic evaluation section (Split 2 Columns) */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                      
                      {/* Left: Input box and active history factors (3 of 5 cols) */}
                      <div className="lg:col-span-3 space-y-6">
                        
                        <div className="bg-white border border-slate-200/60 p-6 rounded-[2.5rem] shadow-sm space-y-5">
                          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Sparkles className="w-4.5 h-4.5 text-violet-500" />
                            Symptom Diagnostician
                          </h3>

                          <form onSubmit={handleAiPrediction} className="space-y-4">
                            <div>
                              <label className="block text-[11px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                                Enter Symptoms Briefly
                              </label>
                              <textarea
                                required
                                rows="4"
                                value={aiSymptoms}
                                onChange={(e) => setAiSymptoms(e.target.value)}
                                placeholder="Example: Feeling chest tightness, mild coughing, and fatigue. Symptoms get worse when walking."
                                className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition duration-200 font-medium placeholder-slate-400 resize-none"
                              ></textarea>
                            </div>

                            {/* Show medical history risk factors used */}
                            <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl space-y-2">
                              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                                Risk Factors Factorin (from Treatment History)
                              </span>
                              {patient.medicalHistory?.length > 0 ? (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {patient.medicalHistory.map((h, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] font-bold bg-violet-50 border border-violet-100 text-violet-750 px-2.5 py-0.5 rounded-full capitalize"
                                    >
                                      {h.condition} ({h.status})
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-400 italic">No medical history logged. Factor weightings set to default.</p>
                              )}
                            </div>

                            <button
                              type="submit"
                              disabled={aiLoading}
                              className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full text-xs font-black shadow-lg shadow-violet-500/10 hover:shadow-violet-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {aiLoading ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Simulating Neural Network Diagnosis...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  <span>Generate Smart Diagnostic Evaluation</span>
                                </>
                              )}
                            </button>
                          </form>
                        </div>

                      </div>

                      {/* Right: AI Prediction assessment result (2 of 5 cols) */}
                      <div className="lg:col-span-2">
                        <div className="bg-white border border-slate-200/60 p-6 rounded-[2.5rem] shadow-sm h-full flex flex-col justify-between gap-6">
                          
                          <div>
                            <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 mb-4">
                              AI Diagnostic Report
                            </h3>

                            {predictionResult ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-5"
                              >
                                {/* Predicted Disease */}
                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Likely Assessment</span>
                                  <h4 className="text-lg font-black text-slate-850">{predictionResult.predictedDisease}</h4>
                                </div>

                                {/* Risk probability indicator */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">Risk Confidence:</span>
                                    <span className="font-mono font-black text-slate-850">
                                      {Math.round(predictionResult.probability * 100)}%
                                    </span>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        predictionResult.riskLevel === 'High'
                                          ? 'bg-red-500'
                                          : predictionResult.riskLevel === 'Medium'
                                          ? 'bg-yellow-500'
                                          : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${predictionResult.probability * 100}%` }}
                                    ></div>
                                  </div>
                                </div>

                                {/* Risk badge */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500 font-medium">Alert Level:</span>
                                  <span
                                    className={`text-[10px] font-black px-2.5 py-0.5 rounded border uppercase tracking-wider ${
                                      predictionResult.riskLevel === 'High'
                                        ? 'bg-red-50 text-red-600 border-red-150'
                                        : predictionResult.riskLevel === 'Medium'
                                        ? 'bg-yellow-50 text-yellow-600 border-yellow-150'
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-150'
                                    }`}
                                  >
                                    {predictionResult.riskLevel}
                                  </span>
                                </div>

                                {/* Recommendations */}
                                <div className="space-y-2 pt-3 border-t border-slate-100">
                                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Clinical Guidance</span>
                                  <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                                    {predictionResult.recommendations}
                                  </p>
                                </div>
                              </motion.div>
                            ) : (
                              <div className="text-center py-12 text-slate-400">
                                <Sparkles className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-xs font-semibold">Ready for symptoms processing.</p>
                                <p className="text-[10px] text-slate-400 mt-1">Diagnosis updates will display here once generated.</p>
                              </div>
                            )}
                          </div>

                          {/* AI Disclaimer */}
                          <div className="border-t border-slate-100 pt-4 flex gap-2 items-start">
                            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[9px] text-slate-400 leading-relaxed">
                              Disclaimer: AI evaluations are suggestions generated automatically for specialty unit routing. Please seek direct medical attention for any clinical decisions.
                            </p>
                          </div>

                        </div>
                      </div>

                    </div>

                    {/* Historical AI evaluations list */}
                    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm space-y-6">
                      <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-4">
                        Historical AI Predictions Log
                      </h3>

                      {historyLoading ? (
                        <div className="text-xs text-slate-400 flex items-center justify-center gap-1.5 py-6">
                          <RefreshCw className="w-4 h-4 animate-spin" /> Syncing past prediction logs...
                        </div>
                      ) : predictionHistory.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 font-medium">No past symptom checks found in the database.</p>
                      ) : (
                        <div className="space-y-4">
                          {predictionHistory.map((h, i) => (
                            <div key={h._id || i} className="p-4 border border-slate-150 hover:bg-slate-50/50 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-medium transition">
                              <div className="space-y-1.5 md:max-w-2xl">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-slate-800 text-sm">
                                    Condition: {h.predictedDisease}
                                  </span>
                                  <span
                                    className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                                      h.riskLevel === 'High'
                                        ? 'bg-red-50 text-red-650 border-red-150'
                                        : h.riskLevel === 'Medium'
                                        ? 'bg-yellow-50 text-yellow-650 border-yellow-150'
                                        : 'bg-emerald-50 text-emerald-650 border-emerald-150'
                                    }`}
                                  >
                                    {h.riskLevel}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    ({Math.round(h.probability * 100)}% Confidence)
                                  </span>
                                </div>
                                <p className="text-slate-500 leading-normal">
                                  Symptoms Checked: <span className="italic text-slate-700">"{h.symptoms}"</span>
                                </p>
                                <p className="text-slate-600 bg-white border border-slate-100 p-2.5 rounded-xl font-medium">
                                  AI Precautions: {h.recommendations}
                                </p>
                              </div>

                              <div className="text-[10px] text-slate-400 font-bold text-right flex-shrink-0">
                                Evaluated: {new Date(h.createdAt).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* 4. TABS: MY HEALTH PROFILE */}
                {activeTab === 'profile' && (
                  <div className="space-y-8">
                    
                    {/* Profile editor Form (3 grids layout) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      
                      {/* Personal & Insurance Details Editor */}
                      <div className="bg-white border border-slate-200/60 p-6 rounded-[2.5rem] shadow-sm space-y-6">
                        <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                          <User className="w-4.5 h-4.5 text-blue-600" />
                          Personal & Health Details
                        </h3>

                        {profileMsg.text && (
                          <div
                            className={`p-3 text-xs rounded-xl font-bold text-center border ${
                              profileMsg.type === 'success'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-red-50 text-red-600 border-red-100'
                            }`}
                          >
                            {profileMsg.text}
                          </div>
                        )}

                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">Patient Name</label>
                              <input
                                required
                                type="text"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition duration-200"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">Primary Phone</label>
                              <input
                                required
                                type="text"
                                value={profilePhone}
                                onChange={(e) => setProfilePhone(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition duration-200"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
                              <input
                                disabled
                                type="email"
                                value={user?.email || ''}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-450 cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">Blood Group</label>
                              <select
                                value={profileBloodGroup}
                                onChange={(e) => setProfileBloodGroup(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition duration-200"
                              >
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                                  <option key={bg} value={bg}>{bg}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Insurance Policy records</h4>
                            
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">Insurance Provider</label>
                              <input
                                type="text"
                                value={insuranceProvider}
                                onChange={(e) => setInsuranceProvider(e.target.value)}
                                placeholder="Star Health Insurance, HDFC Ergo, etc."
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Policy Number</label>
                                  <input
                                    type="text"
                                    value={policyNumber}
                                    onChange={(e) => setPolicyNumber(e.target.value)}
                                    placeholder="POL-992-882"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition"
                                  />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Coverage Limit (INR)</label>
                                  <input
                                    type="number"
                                    value={coverageLimit}
                                    onChange={(e) => setCoverageLimit(e.target.value)}
                                    placeholder="500000"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition"
                                  />
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Emergency Contact</h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Contact Name</label>
                                <input
                                  type="text"
                                  value={emergencyName}
                                  onChange={(e) => setEmergencyName(e.target.value)}
                                  placeholder="Full Name"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Relationship</label>
                                <input
                                  type="text"
                                  value={emergencyRelationship}
                                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                                  placeholder="Spouse / Parent / Sibling"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">Contact Phone</label>
                              <input
                                type="text"
                                value={emergencyPhone}
                                onChange={(e) => setEmergencyPhone(e.target.value)}
                                placeholder="Contact Phone"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/5 hover:scale-[1.01] cursor-pointer"
                          >
                            Save Profile changes
                          </button>
                        </form>
                      </div>

                      {/* Treatment History and additions */}
                      <div className="space-y-8">
                        
                        {/* Add Medical History condition */}
                        <div className="bg-white border border-slate-200/60 p-6 rounded-[2.5rem] shadow-sm space-y-4">
                          <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <Plus className="w-4.5 h-4.5 text-emerald-600" />
                            Log Medical History Condition
                          </h3>

                          {historyMsg.text && (
                            <div
                              className={`p-3 text-xs rounded-xl font-bold text-center border ${
                                historyMsg.type === 'success'
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  : 'bg-red-50 text-red-600 border-red-100'
                              }`}
                            >
                              {historyMsg.text}
                            </div>
                          )}

                          <form onSubmit={handleAddCondition} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Medical Condition</label>
                                <input
                                  required
                                  type="text"
                                  value={newCondition}
                                  onChange={(e) => setNewCondition(e.target.value)}
                                  placeholder="e.g. Asthma, Diabetes Typ-II"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Current Status</label>
                                <select
                                  value={newConditionStatus}
                                  onChange={(e) => setNewConditionStatus(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition"
                                >
                                  <option value="active">Active (Treated)</option>
                                  <option value="managed">Managed (Medicated)</option>
                                  <option value="resolved">Resolved (Cured)</option>
                                </select>
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/5 hover:scale-[1.01] cursor-pointer"
                            >
                              Save Condition to Records
                            </button>
                          </form>
                        </div>

                        {/* Interactive vertical treatment timeline */}
                        <div className="bg-white border border-slate-200/60 p-6 rounded-[2.5rem] shadow-sm space-y-6">
                          <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <Activity className="w-4.5 h-4.5 text-indigo-500" />
                            Treatment History Timeline
                          </h3>

                          {patient.medicalHistory?.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-6 font-medium">No treatment history logged yet.</p>
                          ) : (
                            <div className="relative pl-6 space-y-6 border-l border-slate-200">
                              {patient.medicalHistory.map((history, idx) => (
                                <div key={idx} className="relative group text-xs font-medium">
                                  {/* Timeline bullet dot */}
                                  <span className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-50 border border-white group-hover:scale-125 transition duration-200"></span>
                                  
                                  <div className="bg-slate-50/50 border border-slate-200/40 p-3 rounded-2xl space-y-1 hover:bg-white hover:border-slate-300 transition duration-200">
                                    <div className="flex justify-between items-center flex-wrap gap-2">
                                      <h4 className="font-extrabold text-slate-800 text-sm capitalize">{history.condition}</h4>
                                      <span
                                        className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                                          history.status === 'active'
                                            ? 'bg-red-50 text-red-650 border-red-150'
                                            : history.status === 'managed'
                                            ? 'bg-yellow-50 text-yellow-650 border-yellow-150'
                                            : 'bg-emerald-50 text-emerald-650 border-emerald-150'
                                        }`}
                                      >
                                        {history.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold block pt-1">
                                      Diagnosed Date: {new Date(history.diagnosedDate || history.createdAt || Date.now()).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>

                    </div>

                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </main>

      {/* Video Call Room Modal Mount */}
      {activeVideoCall && (
        <VideoCallRoom
          isOpen={!!activeVideoCall}
          onClose={() => setActiveVideoCall(null)}
          channelName={`Appointment_${activeVideoCall._id}`}
          userName={user?.name || 'Patient'}
          userRole="Patient"
        />
      )}

      {/* Prescription Detail Viewer Modal */}
      <AnimatePresence>
        {selectedPrescription && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200/60 p-6 rounded-[2.5rem] max-w-xl w-full text-slate-800 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-emerald-500" />
                  Prescription Details
                </h3>
                <button 
                  onClick={() => setSelectedPrescription(null)}
                  className="text-slate-400 hover:text-slate-650 transition font-black cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Printable prescription card */}
              <div id="patient-printable-prescription" className="bg-slate-50 border border-slate-200/80 p-6 rounded-3xl space-y-5 text-xs shadow-inner">
                <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="font-extrabold text-blue-600 text-sm uppercase tracking-wide">Q9 Multi-Specialty Hospital</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Clinical Telehealth Services</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Date Issued</span>
                    <span className="font-black text-slate-700">{new Date(selectedPrescription.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Doctor Specialist</span>
                    <strong className="text-slate-800 font-black text-sm">Dr. {selectedPrescription.doctorId?.userId?.name || 'Clinical Practitioner'}</strong>
                    <span className="block text-[10px] text-slate-500 font-semibold">{selectedPrescription.doctorId?.specialization || 'Clinical Specialist'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Patient Details</span>
                    <strong className="text-slate-800 font-black text-sm">{user?.name}</strong>
                    <span className="block text-[10px] text-slate-500 font-semibold">Blood Group: {patient?.bloodGroup || 'O+'}</span>
                  </div>
                </div>

                {/* Rx Medicines list */}
                <div className="space-y-3.5">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Prescribed Medications (Rx)</span>
                  {(!selectedPrescription.medications || selectedPrescription.medications.length === 0) ? (
                    <p className="text-slate-400 italic">No medications prescribed on this summary sheet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedPrescription.medications.map((m, idx) => (
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

                {selectedPrescription.instructions && (
                  <div className="border-t border-slate-200 pt-3">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider mb-1">Clinical Remarks & Instructions</span>
                    <p className="text-slate-650 italic font-semibold leading-relaxed p-3 bg-white border border-slate-100 rounded-xl">
                      "{selectedPrescription.instructions}"
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
                    const printContents = document.getElementById('patient-printable-prescription').innerHTML;
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Prescription - Dr. ${selectedPrescription.doctorId?.userId?.name}</title>
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
                  onClick={() => setSelectedPrescription(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
