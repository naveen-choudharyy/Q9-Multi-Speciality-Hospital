import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, ShieldCheck, CheckCircle, AlertCircle, Receipt, ArrowRight, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  doctor,
  appointmentDate,
  symptoms,
  consultationType
}) {
  const [step, setStep] = useState('summary'); // 'summary' | 'processing' | 'success' | 'failed'
  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState({ subTotal: 0, taxAmount: 0, grandTotal: 0 });
  const [orderId, setOrderId] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSimulated, setIsSimulated] = useState(false);

  useEffect(() => {
    if (isOpen && doctor) {
      createPaymentOrder();
    }
  }, [isOpen, doctor, consultationType]);

  const createPaymentOrder = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/payments/create-order', {
        doctorId: doctor._id,
        consultationType
      });
      if (res.data.success) {
        setFees(res.data.feesDetails);
        setOrderId(res.data.orderId);
        setIsSimulated(res.data.isSimulated);
      }
    } catch (err) {
      console.error("Error creating payment order: ", err);
      setErrorMsg('Failed to initialize billing order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamically load Razorpay SDK script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    setStep('processing');
    
    if (isSimulated) {
      // Run checkout simulation fallback
      setTimeout(async () => {
        try {
          const verifyRes = await api.post('/payments/verify', {
            razorpayOrderId: orderId,
            razorpayPaymentId: `pay_mock_${Math.random().toString(36).slice(2, 11)}`,
            razorpaySignature: 'mock_signature',
            doctorId: doctor._id,
            consultationType,
            dateTime: appointmentDate,
            symptoms,
            isSimulated: true
          });

          if (verifyRes.data.success) {
            setInvoice(verifyRes.data.invoice);
            setStep('success');
          } else {
            setStep('failed');
          }
        } catch (err) {
          console.error("Simulation verification error: ", err);
          setErrorMsg(err.response?.data?.message || 'Verification failed');
          setStep('failed');
        }
      }, 2000);
      return;
    }

    // Real Razorpay Checkout flow
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setErrorMsg('Failed to load payment checkout SDK. Check internet connection.');
      setStep('failed');
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      amount: fees.grandTotal * 100, // in paise
      currency: 'INR',
      name: 'Q9 Multi-Specialty Hospital',
      description: `Consultation Fee - Dr. ${doctor.userId?.name}`,
      order_id: orderId,
      handler: async function (response) {
        setStep('processing');
        try {
          const verifyRes = await api.post('/payments/verify', {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            doctorId: doctor._id,
            consultationType,
            dateTime: appointmentDate,
            symptoms,
            isSimulated: false
          });

          if (verifyRes.data.success) {
            setInvoice(verifyRes.data.invoice);
            setStep('success');
          } else {
            setStep('failed');
          }
        } catch (err) {
          console.error("Payment signature verification failed: ", err);
          setErrorMsg(err.response?.data?.message || 'Verification failed');
          setStep('failed');
        }
      },
      prefill: {
        name: 'Patient User',
        email: 'patient@q9hospital.com',
        contact: '9999999999'
      },
      theme: {
        color: '#2563EB' // blue-600 Q9 theme color
      },
      modal: {
        ondismiss: function () {
          setStep('summary');
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handleFinish = () => {
    if (step === 'success' && invoice) {
      onSuccess({ invoiceData: invoice, razorpayPaymentId: invoice.transactionId });
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={step === 'processing' ? null : onClose}></div>

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white border border-slate-200/60 rounded-3xl shadow-xl max-w-md w-full overflow-hidden z-10 text-slate-800"
      >
        {/* Header (visible in summary/failed steps) */}
        {step !== 'processing' && step !== 'success' && (
          <div className="flex justify-between items-center p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span>Checkout Billing</span>
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 1: SUMMARY */}
        {step === 'summary' && (
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-slate-500 text-xs font-semibold">Initializing bill details...</span>
              </div>
            ) : errorMsg ? (
              <div className="text-center py-6 space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">{errorMsg}</p>
                <button onClick={createPaymentOrder} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
                  Retry Order
                </button>
              </div>
            ) : (
              <>
                {/* Appointment Brief */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                  <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full font-bold uppercase">
                    {consultationType} consultation
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">Dr. {doctor?.userId?.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{doctor?.specialization}</p>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Schedule: {new Date(appointmentDate).toLocaleString()}
                  </div>
                </div>

                {/* Pricing Details */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Consultation Fee</span>
                    <span className="text-slate-800 font-semibold">₹{fees.subTotal?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">GST (18%)</span>
                    <span className="text-slate-800 font-semibold">₹{fees.taxAmount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-slate-100 pt-3">
                    <span className="text-slate-900">Total Payable</span>
                    <span className="text-blue-600">₹{fees.grandTotal?.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {isSimulated && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs p-3 rounded-xl flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                    <span>Razorpay keys absent. Running in simulated transaction mode.</span>
                  </div>
                )}

                {/* CTAs */}
                <button
                  onClick={handleCheckout}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-100"
                >
                  <span>Pay & Book Appointment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}

        {/* STEP 2: PROCESSING */}
        {step === 'processing' && (
          <div className="p-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <div>
              <h4 className="font-bold text-slate-900 text-base">Processing Transaction</h4>
              <p className="text-xs text-slate-500 mt-1">Please do not refresh the page or click back.</p>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && invoice && (
          <div className="p-8 text-center space-y-6">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle className="w-8 h-8" />
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 text-xl">Payment Confirmed!</h4>
              <p className="text-xs text-slate-500 mt-1">Your appointment has been successfully scheduled.</p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-left space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                <span className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5" />
                  {invoice.invoiceNumber}
                </span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-black uppercase">
                  PAID
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctor:</span>
                  <span className="text-slate-800 font-bold">Dr. {doctor?.userId?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type:</span>
                  <span className="text-slate-800 font-medium capitalize">{invoice.consultationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="text-slate-800 font-mono text-[11px] truncate max-w-[150px]">{invoice.transactionId}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-200/50 pt-2 text-slate-900">
                  <span>Total Paid:</span>
                  <span className="text-emerald-600">₹{invoice.grandTotal}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md transition"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* STEP 4: FAILED */}
        {step === 'failed' && (
          <div className="p-8 text-center space-y-6">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-lg">Transaction Failed</h4>
              <p className="text-xs text-slate-500 mt-1">{errorMsg || 'We were unable to verify your payment signature.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={createPaymentOrder}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Retry Payment
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
