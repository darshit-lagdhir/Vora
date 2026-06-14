import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../services/apiClient.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  CreditCard, 
  Check, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  ShieldCheck,
  Calendar,
  Clock,
  CheckCircle
} from 'lucide-react';
import {
  getCardBrand,
  formatCardNumber,
  formatExpiry,
  formatCvc,
  calculateTotals
} from '../../utils/checkoutUtils.js';

// ─── LOCAL CHECKOUT ERROR BOUNDARY ───────────────────────────────────
class CheckoutErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CheckoutErrorBoundary] caught exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-zinc-950 px-4 text-white">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-red-500/10 p-8 rounded-2xl text-center space-y-4 max-w-lg w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white font-display">Checkout Handshake Failed</h4>
              <p className="text-xs text-zinc-550 mt-1">An error occurred during payment gateway configuration. Please refresh and try again.</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="text-xs px-4 py-2 mx-auto bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border-none cursor-pointer font-sans"
            >
              Refresh Checkout
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── DYNAMIC CARD BRAND BADGE ─────────────────────────────────────────
const CardBrandIcon = ({ brand }) => {
  return (
    <div className="h-5 flex items-center justify-center select-none font-mono">
      {brand === 'visa' && (
        <span className="text-[10px] font-black text-blue-500 tracking-wider italic font-technical bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
          VISA
        </span>
      )}
      {brand === 'mastercard' && (
        <span className="text-[10px] font-black text-orange-500 tracking-wider italic font-technical bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
          MC
        </span>
      )}
      {brand === 'amex' && (
        <span className="text-[10px] font-black text-teal-400 tracking-wider italic font-technical bg-teal-400/10 border border-teal-400/20 px-1.5 py-0.5 rounded">
          AMEX
        </span>
      )}
      {brand === 'generic' && (
        <CreditCard className="w-4 h-4 text-zinc-650" />
      )}
    </div>
  );
};

// ─── PRIMARY CHECKOUT FUNNEL CONTENT ──────────────────────────────────
function CheckoutFunnelContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=/checkout/${id}`);
    }
  }, [user, authLoading, navigate, id]);

  // Event State
  const [event, setEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);

  // Form inputs
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [showBilling, setShowBilling] = useState(false);
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  // Transaction Choreography States
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [txnSuccess, setTxnSuccess] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Math totals
  const totals = useMemo(() => calculateTotals(149.00), []);

  // 1. Fetch event specs
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setEventLoading(true);
        const res = await apiClient.get(`/api/v1/events/${id}`);
        if (res.data?.success) {
          setEvent(res.data.data);
        }
      } catch (err) {
        console.error("Failed to query live event metadata. Using mock fallback details.");
        setEvent({
          id,
          title: 'Vora Inaugural Summit 2026',
          start_timestamp: new Date(Date.now() + 86400000 * 5).toISOString(),
          end_timestamp: new Date(Date.now() + 86400000 * 5 + 14400000).toISOString(),
          banner_image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80'
        });
      } finally {
        setEventLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  // Card formatting
  const handleCardNumberChange = (e) => {
    setCardNumber(formatCardNumber(e.target.value));
    if (paymentError) setPaymentError(null);
  };

  const handleExpiryChange = (e) => {
    setCardExpiry(formatExpiry(e.target.value));
    if (paymentError) setPaymentError(null);
  };

  const handleCvcChange = (e) => {
    setCardCvc(formatCvc(e.target.value, cardNumber));
    if (paymentError) setPaymentError(null);
  };

  const cardBrand = useMemo(() => getCardBrand(cardNumber), [cardNumber]);

  // Form lock logic
  const isFormLocked = useMemo(() => {
    const cleanCard = cardNumber.replace(/\D/g, '');
    const expectedCardLen = cardBrand === 'amex' ? 15 : 16;
    const expectedCvcLen = cardBrand === 'amex' ? 4 : 3;

    return (
      cardholderName.trim().length === 0 ||
      cleanCard.length !== expectedCardLen ||
      cardExpiry.length !== 5 ||
      cardCvc.length !== expectedCvcLen
    );
  }, [cardholderName, cardNumber, cardExpiry, cardCvc, cardBrand]);

  const handlePayClick = (e) => {
    if (isFormLocked) {
      e.preventDefault();
      const btn = document.getElementById('btn-authorize-payment');
      if (btn) {
        btn.classList.add('animate-shake');
        setTimeout(() => btn.classList.remove('animate-shake'), 400);
      }
    }
  };

  // Checkout submission
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (isFormLocked || isProcessing) return;

    setIsProcessing(true);
    setPaymentError(null);

    const cleanCard = cardNumber.replace(/\D/g, '');
    const isMockDecline = cleanCard === '4000000000000002';

    // Latency and Climax Delays sequence (Task 5 Processing Sequence)
    const delayPromise = new Promise((resolve) => setTimeout(resolve, 3000));

    // API Request
    const randString = Math.random().toString(36).substring(2, 10).toUpperCase();
    const idempotencyKey = `KEY-CHECKOUT-${Date.now()}-${randString}`;
    
    let apiSuccess = false;
    let apiData = null;
    let apiError = null;

    try {
      if (isMockDecline) {
        throw new Error('Your card was declined by the issuing bank. Please use a valid simulation card number.');
      }

      const res = await apiClient.post(
        '/api/v1/registrations',
        { event_id: id },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      if (res.data?.success) {
        apiSuccess = true;
        apiData = res.data.data;
      } else {
        throw new Error(res.data?.message || 'Secure registration checkout refused by system boundaries.');
      }
    } catch (err) {
      apiError = err.response?.data?.message || err.message || 'Transaction processing failed.';
    }

    // Wait until at least 3 seconds have passed to satisfy the visual security latency
    await delayPromise;

    if (!apiSuccess) {
      setPaymentError(apiError);
      setIsProcessing(false);
      return;
    }

    // Trigger green success checkmark visual resolution
    setTxnSuccess(true);
    
    const finalTxnId = apiData.transaction_id || `TXN-${apiData.registration.id.substring(0, 8).toUpperCase()}-${(apiData.registration.ticket_hash || '').split('-')[2] || 'MOCK'}`;
    setReceiptData({
      txnId: finalTxnId,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      last4: cleanCard.slice(-4),
      brand: cardBrand.toUpperCase()
    });

    // 1.5 seconds later, transition to final receipt ticket handoff (Task 6)
    setTimeout(() => {
      setShowReceipt(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-white font-sans relative select-none items-center justify-center overflow-x-hidden">
      
      {/* Dynamic Keyframes for Input Shake Animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.35s ease-in-out;
        }
      `}</style>

      {/* Cancel Navigation Link */}
      {!showReceipt && (
        <button
          onClick={() => navigate(-1)}
          disabled={isProcessing}
          className="absolute top-6 left-6 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors duration-200 font-sans text-xs outline-none border-none bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed z-30"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="font-semibold uppercase tracking-wider">Cancel Transaction & Return</span>
        </button>
      )}

      <AnimatePresence mode="wait">
        {!showReceipt ? (
          /* SECTION A: PAYMENT ENTRY INTERFACE */
          <motion.div
            key="checkout-split"
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`w-full max-w-6xl px-6 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch transition-all duration-500 ${
              isProcessing ? 'opacity-30 blur-sm pointer-events-none' : ''
            }`}
          >
            {/* LEFT COLUMN: Order Summary Manifest */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6 text-left">
              <div className="space-y-1.5">
                <h1 className="text-3xl font-extrabold tracking-tighter text-white font-display uppercase">
                  Registration Summary
                </h1>
                <p className="text-zinc-500 text-xs font-sans">
                  Finalize your transaction details below to secure your seat.
                </p>
              </div>

              {/* Bento Card Wrapper */}
              <div className="bg-zinc-900/30 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-ambient relative overflow-hidden">
                <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/10 via-transparent to-transparent rounded-t-3xl" />

                {/* Event core title and price row */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-3">
                    <h2 className="text-lg font-bold tracking-tight text-white font-display uppercase leading-tight line-clamp-2">
                      {event?.title || 'Vora Event Webcast'}
                    </h2>
                    
                    {/* Time metrics */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-technical text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary-500" />
                        <span>
                          {event?.start_timestamp 
                            ? new Date(event.start_timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) 
                            : 'June 25, 2026'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary-500" />
                        <span>
                          {event?.start_timestamp 
                            ? new Date(event.start_timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) 
                            : '9:00 AM'} EST
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Integer cost display */}
                  <div className="text-right shrink-0 font-technical select-all">
                    <span className="text-xs font-bold text-zinc-550 mr-0.5">$</span>
                    <span className="text-3xl font-extrabold text-white tracking-tighter">149.00</span>
                  </div>
                </div>

                {/* Subtle horizontal separator line */}
                <div className="h-[1px] bg-white/5 w-full" />

                {/* Financial breakdown stack */}
                <div className="space-y-3 text-xs font-sans">
                  <div className="flex justify-between items-center text-zinc-500">
                    <span className="font-semibold">Admission Subtotal</span>
                    <span className="font-technical text-zinc-300 font-bold">$149.00</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-500">
                    <span className="font-semibold">Estimated IRS Tax (5%)</span>
                    <span className="font-technical text-zinc-300 font-bold">$7.45</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-500">
                    <span className="font-semibold">Platform Convenience Fee</span>
                    <span className="font-technical text-zinc-300 font-bold">$3.55</span>
                  </div>

                  {/* Grand total highlighted block */}
                  <div className="bg-primary-500/5 border border-primary-500/10 rounded-2xl p-4 flex justify-between items-baseline mt-4 select-all">
                    <span className="text-xs font-bold text-white font-sans uppercase tracking-wider">Total Amount Due</span>
                    <div className="text-right">
                      <span className="text-3xl font-bold font-technical tracking-tighter text-white">
                        ${totals.grandTotal.toFixed(2)}
                      </span>
                      <span className="block text-[8px] font-technical text-zinc-550 font-extrabold uppercase tracking-widest mt-1">
                        USD currency
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* RIGHT COLUMN: Payment Input Form */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-4">
              
              {/* Trust Indicators header */}
              <div className="flex items-center justify-start gap-2 text-[10px] font-bold text-zinc-500 font-accent uppercase tracking-widest pl-2">
                <ShieldCheck className="w-4 h-4 text-primary-500" />
                <span>Secure Encrypted Checkout</span>
              </div>

              {/* soft-glass input block wrapper */}
              <div 
                className="bg-zinc-900/30 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-ambient relative flex flex-col"
                style={{
                  boxShadow: '0 20px 40px rgba(124, 58, 237, 0.04)'
                }}
              >
                <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/10 via-transparent to-transparent rounded-t-3xl" />
                
                {/* Visual outline methods icons */}
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-[10px] font-bold text-zinc-500 font-technical uppercase tracking-wider">Accepted Cards</span>
                  <div className="flex items-center gap-2 font-technical text-[8px] font-bold text-zinc-450 select-none">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-white/5">VISA</span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-white/5">MC</span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-white/5">AMEX</span>
                  </div>
                </div>

                {/* Secure error banner alerts */}
                <AnimatePresence>
                  {paymentError && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl flex items-start gap-2.5 leading-relaxed text-left select-none"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="text-[10px] font-semibold font-sans">
                        <span className="font-bold block uppercase tracking-wider mb-0.5">Payment Failed</span>
                        {paymentError}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input Fields */}
                <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-left">
                  
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-technical block">Cardholder Name</span>
                    <input
                      type="text"
                      required
                      placeholder="JOHN DOE"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                      className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-primary-500 rounded-xl text-xs px-4 py-3 outline-none transition-all duration-300 focus:ring-1 focus:ring-primary-500/50 text-white placeholder-zinc-700 font-form"
                    />
                  </div>

                  {/* Card number field */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-technical block">Card Number</span>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="4111 1111 1111 1111"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-primary-500 rounded-xl text-xs px-4 py-3 pr-12 outline-none transition-all duration-300 focus:ring-1 focus:ring-primary-500/50 text-white placeholder-zinc-700 font-technical"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <CardBrandIcon brand={cardBrand} />
                      </div>
                    </div>
                  </div>

                  {/* Expiration and CVC fields side-by-side */}
                  <div className="grid grid-cols-2 gap-4">
                    
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-technical block">Expiration Date</span>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-primary-500 rounded-xl text-xs px-4 py-3 outline-none transition-all duration-300 focus:ring-1 focus:ring-primary-500/50 text-white placeholder-zinc-700 font-technical text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-technical block">Security Code (CVV)</span>
                      <input
                        type="text"
                        required
                        placeholder={cardBrand === 'amex' ? '1234' : '123'}
                        value={cardCvc}
                        onChange={handleCvcChange}
                        className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-primary-500 rounded-xl text-xs px-4 py-3 outline-none transition-all duration-300 focus:ring-1 focus:ring-primary-500/50 text-white placeholder-zinc-700 font-technical text-center"
                      />
                    </div>

                  </div>

                  {/* Billing address option toggle block */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between select-none">
                    <span className="text-[10px] font-bold text-zinc-500 font-technical uppercase tracking-wider">Billing Address</span>
                    <button
                      type="button"
                      onClick={() => setShowBilling(!showBilling)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer border-none flex items-center shrink-0 ${
                        showBilling ? 'bg-primary-600' : 'bg-zinc-800'
                      }`}
                    >
                      <motion.div
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-4 h-4 bg-white rounded-full shadow-md"
                        style={{ x: showBilling ? 16 : 0 }}
                      />
                    </button>
                  </div>

                  {/* Sliding optional fields */}
                  <AnimatePresence>
                    {showBilling && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4 pt-1"
                      >
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-technical block">Street Address</span>
                          <input
                            type="text"
                            placeholder="123 Cyberpunk Blvd"
                            value={streetAddress}
                            onChange={(e) => setStreetAddress(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-primary-500 rounded-xl text-xs px-4 py-3 outline-none text-white placeholder-zinc-700 font-form"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-technical block">City</span>
                            <input
                              type="text"
                              placeholder="New York"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-primary-500 rounded-xl text-xs px-3 py-3 outline-none text-white placeholder-zinc-700 font-form"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-technical block">State</span>
                            <input
                              type="text"
                              placeholder="NY"
                              value={state}
                              onChange={(e) => setState(e.target.value.toUpperCase())}
                              className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-primary-500 rounded-xl text-xs px-3 py-3 outline-none text-white placeholder-zinc-700 font-form text-center"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-technical block">Zip Code</span>
                            <input
                              type="text"
                              placeholder="10001"
                              value={zip}
                              onChange={(e) => setZip(e.target.value.replace(/\D/g, '').substring(0, 5))}
                              className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-primary-500 rounded-xl text-xs px-3 py-3 outline-none text-white placeholder-zinc-700 font-technical text-center"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submission payment trigger */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      id="btn-authorize-payment"
                      onClick={handlePayClick}
                      className={`w-full py-4 rounded-xl text-xs font-bold font-form uppercase tracking-wider transition-all duration-300 border-none outline-none relative flex items-center justify-center gap-2 select-none ${
                        isFormLocked
                          ? 'bg-zinc-850 text-zinc-650 opacity-40 cursor-not-allowed'
                          : 'bg-primary-600 hover:bg-primary-500 text-white cursor-pointer shadow-lg shadow-primary-600/15 active:scale-[0.98]'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Authorize Payment of ${totals.grandTotal.toFixed(2)}</span>
                    </button>
                  </div>

                  {/* Test helper details notification */}
                  <p className="text-[9px] text-zinc-650 font-sans leading-relaxed text-center max-w-[280px] mx-auto pt-2">
                    Enter <span className="font-mono text-zinc-400">4000 0000 0000 0002</span> to simulate a bank decline block.
                  </p>

                </form>

              </div>
            </div>
          </motion.div>
        ) : (
          /* SECTION B: CRYPTOGRAPHIC RECEIPT MATRIX */
          <motion.div
            key="checkout-receipt"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-lg px-6 py-20 text-center"
          >
            {/* receipt card chassis */}
            <div 
              className="bg-zinc-900/30 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 space-y-6 shadow-ambient relative flex flex-col items-center overflow-hidden"
              style={{
                boxShadow: '0 30px 60px rgba(0,0,0,0.5), 0 0 50px rgba(16,185,129,0.02)'
              }}
            >
              <div className="absolute left-0 right-0 top-0 h-[1.5px] bg-gradient-to-r from-emerald-500/20 via-transparent to-transparent rounded-t-3xl" />
              
              {/* Success check badge */}
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold font-display tracking-tight text-white uppercase">
                  Registration Secured
                </h2>
                <p className="text-zinc-400 text-xs font-sans max-w-xs mx-auto leading-relaxed">
                  Your seat for the virtual event has been confirmed and the transaction is complete.
                </p>
              </div>

              {/* receipt metadata grid (Task 6 details) */}
              <div className="w-full border-t border-b border-white/5 py-4 space-y-3.5 text-left text-xs font-sans">
                
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-550 uppercase tracking-widest font-accent text-[9px]">Amount Paid</span>
                  <span className="font-technical text-white font-bold">${totals.grandTotal.toFixed(2)} USD</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-550 uppercase tracking-widest font-accent text-[9px]">Date Sponsored</span>
                  <span className="font-technical text-white font-bold">{receiptData?.date}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-550 uppercase tracking-widest font-accent text-[9px]">Payment Method</span>
                  <span className="font-technical text-white font-bold">{receiptData?.brand} •••• {receiptData?.last4}</span>
                </div>

                <div className="flex justify-between items-center select-all">
                  <span className="font-bold text-zinc-550 uppercase tracking-widest font-accent text-[9px]">Transaction ID</span>
                  <span className="font-technical text-primary-400 font-bold tracking-tight">
                    {receiptData?.txnId}
                  </span>
                </div>

              </div>

              {/* Primary ticket wallet launch trigger */}
              <button
                onClick={() => navigate('/attendee/wallet')}
                className="w-full py-4 rounded-xl text-xs font-bold font-form uppercase tracking-wider bg-primary-600 hover:bg-primary-500 text-white cursor-pointer shadow-lg shadow-primary-600/15 transition-all select-none border-none outline-none"
              >
                Access Digital Ticket Wallet
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── IMMERSION MASKING LOADER OVERLAY ─── */}
      <AnimatePresence>
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none bg-zinc-950/20 backdrop-blur-sm pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center space-y-4 bg-zinc-900/60 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl"
            >
              {!txnSuccess ? (
                <>
                  <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                  <div className="text-center space-y-1">
                    <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">GATEWAY ENCRYPTING</span>
                    <span className="block text-xs font-bold text-white font-sans leading-none">Authorizing transaction logs...</span>
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                  </motion.div>
                  <div className="text-center space-y-1">
                    <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-technical">SECURE OK</span>
                    <span className="block text-xs font-bold text-white font-sans leading-none">Payment Authorized</span>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function CheckoutFunnel() {
  return (
    <CheckoutErrorBoundary>
      <CheckoutFunnelContent />
    </CheckoutErrorBoundary>
  );
}
