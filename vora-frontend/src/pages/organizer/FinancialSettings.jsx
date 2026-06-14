import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import BrutalistButton from '../../components/BrutalistButton.jsx';
import BrutalistInput from '../../components/BrutalistInput.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import VoraModal from '../../components/VoraModal.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, 
  Lock, 
  AlertCircle, 
  Check, 
  Eye, 
  EyeOff, 
  UploadCloud, 
  Plus, 
  Trash2,
  Calendar,
  ChevronRight,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  Building,
  Mail,
  MapPin,
  CheckCircle2
} from 'lucide-react';

// ─── LOCAL ERROR BOUNDARY FOR ROBUST FAILURE HANDLING ────────────────
class SettingsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[FinancialSettings ErrorBoundary] caught exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[50vh] px-4">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-red-500/10 p-8 rounded-2xl text-center space-y-4 max-w-lg w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white font-display">Unable to load Payout Settings</h4>
              <p className="text-xs text-zinc-500 mt-1">A secure connection handshake timed out. Check your firewall settings and retry.</p>
            </div>
            <BrutalistButton 
              variant="secondary" 
              onClick={() => this.setState({ hasError: false })}
              className="text-xs px-4 py-2 mx-auto"
            >
              Retry Handshake
            </BrutalistButton>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── CUSTOM DEBOUNCE HOOK ──────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ─── LOCALIZED MICRO-CHECKMARK INDICATOR ────────────────────────────
const SaveIndicator = ({ state }) => {
  if (!state) return <div className="w-16 h-5" />; // maintain layout flow

  if (state === 'typing') {
    return (
      <div className="flex items-center gap-1 text-zinc-600 select-none">
        <span className="w-1 h-1 rounded-full bg-zinc-650 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 rounded-full bg-zinc-650 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1 h-1 rounded-full bg-zinc-650 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    );
  }
  
  if (state === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-primary-400 select-none animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin text-primary-500" />
        <span className="text-[10px] font-medium tracking-wide">Saving...</span>
      </div>
    );
  }

  if (state === 'saved') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-1.5 text-primary-500 select-none font-sans"
      >
        <Check className="w-3.5 h-3.5 text-primary-500 stroke-[3.5]" />
        <span className="text-[10px] font-semibold tracking-wide uppercase">Saved</span>
      </motion.div>
    );
  }

  return <div className="w-16 h-5" />;
};

// ─── PRIMARY COMPONENT IMPLEMENTATION ────────────────────────────────
function FinancialSettingsContent() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  // Zero-Trust Security Verification Check
  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate('/auth');
      else if (user.role !== 'organizer') navigate('/attendee');
    }
  }, [user, authLoading, navigate]);

  // Routing navigation tab state
  const [activeTab, setActiveTab] = useState('bank'); // bank | kyc | tax | invoice

  // 1. Bank Account Connected States
  const [bankAccount, setBankAccount] = useState({
    bankName: 'Chase Bank',
    routingNumber: '•••• 4242',
    accountNumMasked: '•••• 9821',
    verified: true
  });

  // Modal / Secure integration workflow states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  
  // Manual bank account forms state
  const [manualHolderName, setManualHolderName] = useState('');
  const [manualRouting, setManualRouting] = useState('');
  const [manualAccountNum, setManualAccountNum] = useState('');
  const [showAccountNum, setShowAccountNum] = useState(false);

  // 2. KYC States
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontDrag, setFrontDrag] = useState(false);
  const [backDrag, setBackDrag] = useState(false);
  const [frontScanning, setFrontScanning] = useState(false);
  const [backScanning, setBackScanning] = useState(false);
  const [kycStatus, setKycStatus] = useState('unverified'); // unverified | processing | verified

  // 3. Payout Schedule Settings
  const [payoutSchedule, setPayoutSchedule] = useState('weekly'); // daily | weekly | manual
  const [payoutDay, setPayoutDay] = useState('Monday');

  // 4. Tax / Invoicing States
  const [taxId, setTaxId] = useState('XX-XXX4289');
  const [companyName, setCompanyName] = useState('Vora Global Events LLC');
  const [taxClassification, setTaxClassification] = useState('llc');
  const [billingAddress, setBillingAddress] = useState('100 Pine St, San Francisco, CA 94111');
  const [invoicingEmail, setInvoicingEmail] = useState('finance@vora.events');
  const [enableEmailReceipts, setEnableEmailReceipts] = useState(true);
  const [requireInvoice, setRequireInvoice] = useState(false);

  // 5. Save State Flags
  const [saveStates, setSaveStates] = useState({});

  // 6. Debounced triggers
  const debouncedTaxId = useDebounce(taxId, 800);
  const debouncedCompanyName = useDebounce(companyName, 800);
  const debouncedBillingAddress = useDebounce(billingAddress, 800);
  const debouncedInvoicingEmail = useDebounce(invoicingEmail, 800);

  const isFirstMount = useRef(true);
  const lastSavedValues = useRef({
    taxId: 'XX-XXX4289',
    companyName: 'Vora Global Events LLC',
    billingAddress: '100 Pine St, San Francisco, CA 94111',
    invoicingEmail: 'finance@vora.events'
  });

  // Safe mutations dispatcher
  const performSaveMutation = (fieldName, value) => {
    if (lastSavedValues.current[fieldName] === value) {
      setSaveStates(prev => {
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
      return;
    }

    setSaveStates(prev => ({ ...prev, [fieldName]: 'saving' }));

    setTimeout(() => {
      lastSavedValues.current[fieldName] = value;
      setSaveStates(prev => ({ ...prev, [fieldName]: 'saved' }));

      // Reset checkmark after 2 seconds
      setTimeout(() => {
        setSaveStates(prev => {
          const copy = { ...prev };
          if (copy[fieldName] === 'saved') {
            delete copy[fieldName];
          }
          return copy;
        });
      }, 2000);
    }, 1000);
  };

  // Run debounced triggers
  useEffect(() => {
    if (isFirstMount.current) return;
    performSaveMutation('taxId', debouncedTaxId);
  }, [debouncedTaxId]);

  useEffect(() => {
    if (isFirstMount.current) return;
    performSaveMutation('companyName', debouncedCompanyName);
  }, [debouncedCompanyName]);

  useEffect(() => {
    if (isFirstMount.current) return;
    performSaveMutation('billingAddress', debouncedBillingAddress);
  }, [debouncedBillingAddress]);

  useEffect(() => {
    if (isFirstMount.current) return;
    performSaveMutation('invoicingEmail', debouncedInvoicingEmail);
  }, [debouncedInvoicingEmail]);

  useEffect(() => {
    isFirstMount.current = false;
  }, []);

  // Immediate save triggers for controls
  const triggerInstantSave = (fieldName, value, setter) => {
    setter(value);
    setSaveStates(prev => ({ ...prev, [fieldName]: 'saving' }));
    
    setTimeout(() => {
      setSaveStates(prev => ({ ...prev, [fieldName]: 'saved' }));
      setTimeout(() => {
        setSaveStates(prev => {
          const copy = { ...prev };
          if (copy[fieldName] === 'saved') delete copy[fieldName];
          return copy;
        });
      }, 2000);
    }, 600);
  };

  // Trigger Stripe Integration link simulation
  const handleStripeConnectLaunch = () => {
    setModalLoading(true);
    setTimeout(() => {
      setBankAccount({
        bankName: 'Stripe Connected Bank',
        routingNumber: '•••• 1122',
        accountNumMasked: '•••• 5544',
        verified: true
      });
      setModalLoading(false);
      setModalOpen(false);
      setManualMode(false);
    }, 2000);
  };

  // Trigger manual bank link
  const handleManualBankSubmit = (e) => {
    e.preventDefault();
    if (!manualHolderName || !manualRouting || !manualAccountNum) return;

    setModalLoading(true);
    setTimeout(() => {
      setBankAccount({
        bankName: 'Manual Bank Setup',
        routingNumber: `•••• ${manualRouting.slice(-4) || '9988'}`,
        accountNumMasked: `•••• ${manualAccountNum.slice(-4) || '8877'}`,
        verified: true
      });
      setModalLoading(false);
      setModalOpen(false);
      setManualMode(false);
      // clear manual inputs
      setManualHolderName('');
      setManualRouting('');
      setManualAccountNum('');
    }, 1500);
  };

  // Drag and drop events logic
  const handleFileDrag = (e, setDrag, state) => {
    e.preventDefault();
    setDrag(state);
  };

  const handleFileDrop = (e, setDrag, setFile, setScanning) => {
    e.preventDefault();
    setDrag(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      setScanning(true);
      
      // Simulate cryptographic scanning pipeline
      setTimeout(() => {
        setFile({
          name: droppedFile.name,
          size: `${(droppedFile.size / 1024 / 1024).toFixed(2)} MB`
        });
        setScanning(false);
      }, 1500);
    }
  };

  const handleFileSelect = (e, setFile, setScanning) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      setScanning(true);
      
      setTimeout(() => {
        setFile({
          name: selectedFile.name,
          size: `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
        });
        setScanning(false);
      }, 1500);
    }
  };

  const triggerKycSubmission = () => {
    if (!frontFile || !backFile) return;
    setKycStatus('processing');
    setTimeout(() => {
      setKycStatus('verified');
    }, 3000);
  };

  const removeKycFiles = () => {
    setFrontFile(null);
    setBackFile(null);
    setKycStatus('unverified');
  };

  // Nav configuration options
  const tabs = [
    { id: 'bank', label: 'Bank Accounts' },
    { id: 'kyc', label: 'Verification (KYC)' },
    { id: 'tax', label: 'Tax Details' },
    { id: 'invoice', label: 'Invoicing' }
  ];

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-zinc-950 text-white font-sans">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-24 space-y-6">
        
        {/* Settings Master Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-6 shrink-0">
          <div>
            <button 
              onClick={() => navigate('/organizer/financials')}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2.5 outline-none transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Financials Ledger</span>
            </button>
            <h1 className="text-3xl font-semibold tracking-tight text-white font-display">
              Payouts & Financial Settings
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Configure secure routing pathways, manage KYC declarations, and customize invoices.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 select-none">
            <Lock className="w-3.5 h-3.5 text-primary-500 shrink-0" />
            <span>Encrypted Bank Connection</span>
          </div>
        </div>

        {/* Tabular Layout Config Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-8">
          
          {/* Settings Sidebar - Left column Navigation */}
          <div className="md:col-span-1 flex flex-col space-y-2">
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex flex-col space-y-1">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`text-left text-sm font-medium px-3 py-2.5 rounded-lg transition-colors cursor-pointer outline-none ${
                      active
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Mobile Tab Carousel (touch targets minimum 44px height) */}
            <div className="md:hidden flex overflow-x-auto gap-2 pb-2 scrollbar-none snap-x border-b border-zinc-900">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`snap-center flex-shrink-0 min-w-[120px] h-11 flex items-center justify-center px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer outline-none ${
                      active 
                        ? 'bg-zinc-800 text-white border-zinc-700/50 shadow-sm' 
                        : 'bg-zinc-900/40 text-zinc-400 border-white/5 hover:text-zinc-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden md:block pt-8 border-t border-zinc-900 mt-6 space-y-3">
              <div className="p-3 bg-zinc-900/20 border border-zinc-850 rounded-xl space-y-2">
                <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Compliance Status</h5>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${kycStatus === 'verified' ? 'bg-emerald-500' : kycStatus === 'processing' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-xs font-medium text-zinc-300">
                    {kycStatus === 'verified' ? 'Verified Account' : kycStatus === 'processing' ? 'Verification Pending' : 'Action Required'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Configuration Stage Panel - Right column */}
          <div className="md:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                
                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 1: BANK ACCOUNTS PANEL                                    */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === 'bank' && (
                  <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6 shadow-soft">
                    
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-white font-display">Connected Bank Accounts</h2>
                      <p className="text-xs text-zinc-400">Manage payment destinations where event revenues will clear.</p>
                    </div>

                    {bankAccount ? (
                      /* Connected Bank Details Card */
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-xl border border-zinc-800 bg-zinc-900/50 gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <Landmark className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-white">{bankAccount.bankName}</h4>
                              <StatusBadge status="success">Verified</StatusBadge>
                            </div>
                            <p className="text-xs text-zinc-500 font-mono mt-0.5">
                              Routing: {bankAccount.routingNumber} • Account: {bankAccount.accountNumMasked}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => { setModalOpen(true); setManualMode(false); }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer outline-none"
                          >
                            Replace
                          </button>
                          <button
                            onClick={() => setBankAccount(null)}
                            className="p-1.5 rounded-lg border border-red-500/10 hover:border-red-500/30 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer outline-none"
                            aria-label="Remove bank account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Unconnected / Empty State Dashboard Area Trigger */
                      <div 
                        onClick={() => setModalOpen(true)}
                        className="border-2 border-dashed border-zinc-800 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-zinc-900/20 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4 text-primary-500 group-hover:scale-105 transition-transform">
                          <Plus className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-semibold text-white mb-1">Link a Payout Account</h4>
                        <p className="text-xs text-zinc-550 max-w-xs leading-relaxed">
                          Setup a verified bank routing connector via Stripe Connect or provide routing information manually.
                        </p>
                      </div>
                    )}

                    {/* Schedule Segmented Configuration */}
                    <div className="pt-6 border-t border-zinc-800/40 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <h3 className="text-sm font-semibold text-white font-display">Payout Schedule</h3>
                          <p className="text-xs text-zinc-500">Configure how often revenues are transferred to your connected bank.</p>
                        </div>
                        <SaveIndicator state={saveStates.payoutSchedule} />
                      </div>

                      {/* Segmented control bar */}
                      <div className="flex p-1 bg-zinc-950 border border-zinc-850 rounded-xl relative max-w-md">
                        {[
                          { value: 'daily', label: 'Automatic (Daily)' },
                          { value: 'weekly', label: 'Automatic (Weekly)' },
                          { value: 'manual', label: 'Manual Payouts' }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => triggerInstantSave('payoutSchedule', opt.value, setPayoutSchedule)}
                            className={`relative z-10 flex-1 py-2 text-xs font-semibold transition-colors cursor-pointer text-center outline-none ${
                              payoutSchedule === opt.value ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {payoutSchedule === opt.value && (
                              <motion.div
                                layoutId="payoutScheduleBg"
                                className="absolute inset-0 bg-zinc-800 border border-zinc-700/60 rounded-lg -z-10"
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                              />
                            )}
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Contextual reveal for Automatic Weekly options */}
                      <AnimatePresence>
                        {payoutSchedule === 'weekly' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-zinc-900/20 border border-zinc-850 p-4 rounded-xl max-w-md"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="space-y-0.5">
                                <label htmlFor="payout-day-select" className="text-xs font-semibold text-zinc-300 block">
                                  Weekly Settlement Day
                                </label>
                                <p className="text-[10px] text-zinc-550">Funds clear in 2-3 business days after settlement.</p>
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0">
                                <select
                                  id="payout-day-select"
                                  value={payoutDay}
                                  onChange={(e) => triggerInstantSave('payoutDay', e.target.value, setPayoutDay)}
                                  className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-medium"
                                >
                                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                                    <option key={d} value={d} className="bg-zinc-950 text-white">{d}</option>
                                  ))}
                                </select>
                                <SaveIndicator state={saveStates.payoutDay} />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>

                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 2: VERIFICATION PANEL (KYC)                               */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === 'kyc' && (
                  <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6 shadow-soft font-sans">
                    
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-white font-display">Identity Verification (KYC)</h2>
                      <p className="text-xs text-zinc-400">Confirm details required to clear payment payouts under FINCEN requirements.</p>
                    </div>

                    {/* Status Alert Banner */}
                    {kycStatus === 'unverified' && (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold">Payouts Paused</h4>
                          <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                            To ensure platform integrity and verify merchant accounts, you must upload front/back scans of a Government Issued Identification document.
                          </p>
                        </div>
                      </div>
                    )}

                    {kycStatus === 'processing' && (
                      <div className="bg-primary-500/10 border border-primary-500/20 text-primary-300 p-4 rounded-xl flex items-start gap-3 animate-pulse">
                        <Loader2 className="w-5 h-5 shrink-0 mt-0.5 animate-spin" />
                        <div>
                          <h4 className="text-sm font-semibold">Verification Under Review</h4>
                          <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                            Our compliance desk is checking your uploaded papers. Updates typically reflect within 1-2 business days. Payout status will remain paused until verified.
                          </p>
                        </div>
                      </div>
                    )}

                    {kycStatus === 'verified' && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold">Identity Verified Successfully</h4>
                          <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                            KYC documents accepted. Merchant payout gateways are fully unlocked and verified.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Dropzones section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      
                      {/* Dropzone Front */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400">Government ID (Front)</label>
                        <div
                          onDragOver={(e) => handleFileDrag(e, setFrontDrag, true)}
                          onDragLeave={(e) => handleFileDrag(e, setFrontDrag, false)}
                          onDrop={(e) => handleFileDrop(e, setFrontDrag, setFrontFile, setFrontScanning)}
                          className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all min-h-[140px] select-none ${
                            frontFile 
                              ? 'border-zinc-800 bg-zinc-900/20' 
                              : frontDrag 
                                ? 'border-primary-500 bg-primary-500/10' 
                                : 'border-zinc-800 hover:border-zinc-750'
                          }`}
                        >
                          {frontScanning ? (
                            <div className="flex flex-col items-center space-y-2">
                              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                              <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase animate-pulse">Scanning file...</span>
                            </div>
                          ) : frontFile ? (
                            <div className="space-y-2 w-full">
                              <div className="text-emerald-400 flex items-center justify-center gap-1 mx-auto">
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span className="text-xs font-semibold">Uploaded</span>
                              </div>
                              <div className="max-w-[150px] mx-auto text-[10px] text-zinc-400 font-mono truncate" title={frontFile.name}>
                                {frontFile.name}
                              </div>
                              <span className="text-[9px] text-zinc-550 block font-mono">{frontFile.size}</span>
                              <button
                                disabled={kycStatus === 'verified' || kycStatus === 'processing'}
                                onClick={() => setFrontFile(null)}
                                className="text-[10px] font-semibold text-red-400 hover:text-red-300 mt-1 cursor-pointer transition-colors block mx-auto outline-none disabled:opacity-30 disabled:pointer-events-none"
                              >
                                Clear File
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                              <UploadCloud className="w-6 h-6 text-zinc-500 mb-2 group-hover:text-zinc-400" />
                              <span className="text-xs font-semibold text-zinc-300 block">Drag file or Browse</span>
                              <span className="text-[9px] text-zinc-550 mt-1">JPEG, PNG, or PDF up to 5MB</span>
                              <input 
                                type="file" 
                                accept="image/jpeg,image/png,application/pdf"
                                onChange={(e) => handleFileSelect(e, setFrontFile, setFrontScanning)}
                                className="hidden" 
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Dropzone Back */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400">Government ID (Back)</label>
                        <div
                          onDragOver={(e) => handleFileDrag(e, setBackDrag, true)}
                          onDragLeave={(e) => handleFileDrag(e, setBackDrag, false)}
                          onDrop={(e) => handleFileDrop(e, setBackDrag, setBackFile, setBackScanning)}
                          className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all min-h-[140px] select-none ${
                            backFile 
                              ? 'border-zinc-800 bg-zinc-900/20' 
                              : backDrag 
                                ? 'border-primary-500 bg-primary-500/10' 
                                : 'border-zinc-800 hover:border-zinc-750'
                          }`}
                        >
                          {backScanning ? (
                            <div className="flex flex-col items-center space-y-2">
                              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                              <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase animate-pulse">Scanning file...</span>
                            </div>
                          ) : backFile ? (
                            <div className="space-y-2 w-full">
                              <div className="text-emerald-400 flex items-center justify-center gap-1 mx-auto">
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span className="text-xs font-semibold">Uploaded</span>
                              </div>
                              <div className="max-w-[150px] mx-auto text-[10px] text-zinc-400 font-mono truncate" title={backFile.name}>
                                {backFile.name}
                              </div>
                              <span className="text-[9px] text-zinc-550 block font-mono">{backFile.size}</span>
                              <button
                                disabled={kycStatus === 'verified' || kycStatus === 'processing'}
                                onClick={() => setBackFile(null)}
                                className="text-[10px] font-semibold text-red-400 hover:text-red-300 mt-1 cursor-pointer transition-colors block mx-auto outline-none disabled:opacity-30 disabled:pointer-events-none"
                              >
                                Clear File
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                              <UploadCloud className="w-6 h-6 text-zinc-500 mb-2 group-hover:text-zinc-400" />
                              <span className="text-xs font-semibold text-zinc-300 block">Drag file or Browse</span>
                              <span className="text-[9px] text-zinc-550 mt-1">JPEG, PNG, or PDF up to 5MB</span>
                              <input 
                                type="file" 
                                accept="image/jpeg,image/png,application/pdf"
                                onChange={(e) => handleFileSelect(e, setBackFile, setBackScanning)}
                                className="hidden" 
                              />
                            </label>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Submit / Status Controls */}
                    {kycStatus === 'unverified' && (
                      <div className="pt-2 flex justify-end">
                        <BrutalistButton
                          variant="primary"
                          onClick={triggerKycSubmission}
                          disabled={!frontFile || !backFile}
                          className="text-xs font-semibold"
                        >
                          Submit ID for Verification
                        </BrutalistButton>
                      </div>
                    )}

                    {kycStatus === 'verified' && (
                      <div className="pt-2 flex justify-end">
                        <BrutalistButton
                          variant="secondary"
                          onClick={removeKycFiles}
                          className="text-xs font-semibold border-red-500/10 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                          Reset Uploads
                        </BrutalistButton>
                      </div>
                    )}

                    {/* Encryption Security Micro-copy */}
                    <div className="pt-4 border-t border-zinc-800/40 text-[10px] text-zinc-500 flex items-center justify-center gap-1.5 text-center leading-relaxed">
                      <Lock className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
                      <span>
                        Your connection is encrypted. Documents are securely transmitted directly to our compliance partner and are not stored on our servers.
                      </span>
                    </div>

                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 3: TAX DETAILS PANEL                                      */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === 'tax' && (
                  <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6 shadow-soft font-sans">
                    
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-white font-display">Tax Information Registry</h2>
                      <p className="text-xs text-zinc-400">Configure Merchant Tax declarations for automated end-of-year 1099 filing structures.</p>
                    </div>

                    {/* Forms layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      <div className="space-y-1.5 relative">
                        <div className="flex justify-between items-center">
                          <label htmlFor="tax-id-field" className="text-xs font-semibold text-zinc-300">Employer Identification Number (EIN)</label>
                          <SaveIndicator state={saveStates.taxId} />
                        </div>
                        <input
                          id="tax-id-field"
                          type="text"
                          placeholder="XX-XXXXXXX"
                          value={taxId}
                          onChange={(e) => handleFieldChange('taxId', e.target.value, setTaxId)}
                          className="w-full bg-zinc-900/50 hover:bg-zinc-900/70 border border-zinc-800 focus:border-primary-500 text-white placeholder-zinc-500 rounded-lg text-xs px-3 py-2.5 outline-none transition-all duration-200 focus:ring-1 focus:ring-primary-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5 relative">
                        <div className="flex justify-between items-center">
                          <label htmlFor="company-name-field" className="text-xs font-semibold text-zinc-300">Company Legal Name</label>
                          <SaveIndicator state={saveStates.companyName} />
                        </div>
                        <div className="relative">
                          <input
                            id="company-name-field"
                            type="text"
                            placeholder="Enter legal business name"
                            value={companyName}
                            onChange={(e) => handleFieldChange('companyName', e.target.value, setCompanyName)}
                            className="w-full bg-zinc-900/50 hover:bg-zinc-900/70 border border-zinc-800 focus:border-primary-500 text-white placeholder-zinc-500 rounded-lg text-xs px-3 py-2.5 pr-8 outline-none transition-all duration-200 focus:ring-1 focus:ring-primary-500"
                          />
                          <Building className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="tax-class-select" className="text-xs font-semibold text-zinc-300">Tax Classification</label>
                        <select
                          id="tax-class-select"
                          value={taxClassification}
                          onChange={(e) => triggerInstantSave('taxClassification', e.target.value, setTaxClassification)}
                          className="w-full bg-zinc-900/50 hover:bg-zinc-900/70 border border-zinc-800 text-white rounded-lg px-3 py-2.5 text-xs outline-none cursor-pointer focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-medium"
                        >
                          <option value="sole" className="bg-zinc-950">Sole Proprietor / Single-member LLC</option>
                          <option value="llc" className="bg-zinc-950">C Corporation / Partnership LLC</option>
                          <option value="nonprofit" className="bg-zinc-950">Tax-exempt 501(c)(3) Entity</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 flex flex-col justify-end">
                        <div className="flex items-center justify-between p-3 bg-zinc-900/20 border border-zinc-850 rounded-lg select-none">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Verification Status</span>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3.5]" /> IRS Validated
                          </span>
                        </div>
                      </div>

                    </div>

                    <div className="text-[10px] text-zinc-500 leading-relaxed border-t border-zinc-800/40 pt-4">
                      Vora reports legal distributions to the Internal Revenue Service using form 1099-K. Ensure your legal name matches your exact TIN / Employer Registration registry records to prevent backup withholding orders.
                    </div>

                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 4: INVOICING PANEL                                        */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === 'invoice' && (
                  <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6 shadow-soft font-sans">
                    
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-white font-display">Invoicing & Billing Details</h2>
                      <p className="text-xs text-zinc-400">Configure public receipts metadata and automate tax invoice processing settings.</p>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 gap-5">
                      
                      <div className="space-y-1.5 relative">
                        <div className="flex justify-between items-center">
                          <label htmlFor="billing-address-field" className="text-xs font-semibold text-zinc-300">Billing Address</label>
                          <SaveIndicator state={saveStates.billingAddress} />
                        </div>
                        <div className="relative">
                          <input
                            id="billing-address-field"
                            type="text"
                            placeholder="Enter business address"
                            value={billingAddress}
                            onChange={(e) => handleFieldChange('billingAddress', e.target.value, setBillingAddress)}
                            className="w-full bg-zinc-900/50 hover:bg-zinc-900/70 border border-zinc-800 focus:border-primary-500 text-white placeholder-zinc-500 rounded-lg text-xs px-3 py-2.5 pr-8 outline-none transition-all duration-200 focus:ring-1 focus:ring-primary-500"
                          />
                          <MapPin className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      <div className="space-y-1.5 relative">
                        <div className="flex justify-between items-center">
                          <label htmlFor="invoicing-email-field" className="text-xs font-semibold text-zinc-300">Invoicing / Finance Email Address</label>
                          <SaveIndicator state={saveStates.invoicingEmail} />
                        </div>
                        <div className="relative">
                          <input
                            id="invoicing-email-field"
                            type="email"
                            placeholder="finance@company.com"
                            value={invoicingEmail}
                            onChange={(e) => handleFieldChange('invoicingEmail', e.target.value, setInvoicingEmail)}
                            className="w-full bg-zinc-900/50 hover:bg-zinc-900/70 border border-zinc-800 focus:border-primary-500 text-white placeholder-zinc-500 rounded-lg text-xs px-3 py-2.5 pr-8 outline-none transition-all duration-200 focus:ring-1 focus:ring-primary-500"
                          />
                          <Mail className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      {/* Toggle switches */}
                      <div className="pt-4 border-t border-zinc-800/40 space-y-4">
                        
                        {/* Toggle 1 */}
                        <div className="flex items-center justify-between p-4 bg-zinc-900/20 border border-zinc-850 rounded-xl">
                          <div className="space-y-0.5 max-w-md pr-4">
                            <label htmlFor="toggle-receipts" className="text-xs font-semibold text-zinc-200">Email Customer Receipts</label>
                            <p className="text-[10px] text-zinc-500">Automatically deliver detailed PDF receipts to attendees immediately after tickets purchase transactions.</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <SaveIndicator state={saveStates.enableEmailReceipts} />
                            <button
                              id="toggle-receipts"
                              type="button"
                              onClick={() => triggerInstantSave('enableEmailReceipts', !enableEmailReceipts, setEnableEmailReceipts)}
                              className={`w-10 h-6 rounded-full transition-colors relative outline-none cursor-pointer ${enableEmailReceipts ? 'bg-primary-600' : 'bg-zinc-800'}`}
                              role="switch"
                              aria-checked={enableEmailReceipts}
                            >
                              <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${enableEmailReceipts ? 'left-5' : 'left-1'}`} />
                            </button>
                          </div>
                        </div>

                        {/* Toggle 2 */}
                        <div className="flex items-center justify-between p-4 bg-zinc-900/20 border border-zinc-850 rounded-xl">
                          <div className="space-y-0.5 max-w-md pr-4">
                            <label htmlFor="toggle-invoices" className="text-xs font-semibold text-zinc-200">Require Tax Invoice for Payouts</label>
                            <p className="text-[10px] text-zinc-500">Require our compliance engine to generate a tax invoice statement before wire settlements are dispatched.</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <SaveIndicator state={saveStates.requireInvoice} />
                            <button
                              id="toggle-invoices"
                              type="button"
                              onClick={() => triggerInstantSave('requireInvoice', !requireInvoice, setRequireInvoice)}
                              className={`w-10 h-6 rounded-full transition-colors relative outline-none cursor-pointer ${requireInvoice ? 'bg-primary-600' : 'bg-zinc-800'}`}
                              role="switch"
                              aria-checked={requireInvoice}
                            >
                              <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${requireInvoice ? 'left-5' : 'left-1'}`} />
                            </button>
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECURE PLAID / STRIPE CONNECT REDIRECT MODAL SIMULATION       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <VoraModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setManualMode(false); }}
        title="Secure Bank Account Setup"
        className="max-w-md"
      >
        <div className="space-y-6 text-zinc-300 font-sans">
          
          {modalLoading ? (
            /* Secure handshaking loader overlay */
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
                <Lock className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">Establishing Secure Tunnel...</h4>
                <p className="text-xs text-zinc-500 max-w-xs">Connecting with merchant authentication servers. Do not close this panel.</p>
              </div>
            </div>
          ) : !manualMode ? (
            /* Stripe Connect Quick portal */
            <div className="space-y-5 text-center">
              
              <div className="w-12 h-12 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto text-primary-500">
                <Lock className="w-5 h-5" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-semibold text-white">Link Account with Stripe Connect</h4>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                  Vora partners with Stripe to verify credentials instantly. This secures transactions and automates payouts.
                </p>
              </div>

              <div className="pt-2">
                <BrutalistButton
                  variant="primary"
                  onClick={handleStripeConnectLaunch}
                  className="w-full text-xs font-semibold justify-center h-10 shadow-glow"
                >
                  Continue with Stripe Connect
                </BrutalistButton>
              </div>

              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider outline-none block mx-auto cursor-pointer"
              >
                Enter bank details manually instead
              </button>

            </div>
          ) : (
            /* Manual bank routing accordion wrapper */
            <form onSubmit={handleManualBankSubmit} className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">Manual Wire Settlement Account</h4>
                <p className="text-xs text-zinc-500">Manually key credentials. Payouts require up to 48 hours for clearing compliance checks.</p>
              </div>

              <div className="space-y-3 pt-2">
                
                <div className="flex flex-col w-full">
                  <label htmlFor="manual-holder" className="text-xs font-semibold text-zinc-300 mb-1">Account Holder Name</label>
                  <input
                    id="manual-holder"
                    type="text"
                    required
                    placeholder="John Doe Legal LLC"
                    value={manualHolderName}
                    onChange={(e) => setManualHolderName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-primary-500 text-white placeholder-zinc-650 rounded-lg text-xs px-3 py-2 outline-none transition-all duration-200 focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="flex flex-col w-full">
                  <label htmlFor="manual-routing" className="text-xs font-semibold text-zinc-300 mb-1">Routing Number</label>
                  <input
                    id="manual-routing"
                    type="text"
                    required
                    maxLength={9}
                    placeholder="9 digit Routing Transit Number"
                    value={manualRouting}
                    onChange={(e) => setManualRouting(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-primary-500 text-white placeholder-zinc-650 rounded-lg text-xs px-3 py-2 outline-none transition-all duration-200 focus:ring-1 focus:ring-primary-500 font-mono"
                  />
                </div>

                <div className="flex flex-col w-full relative">
                  <label htmlFor="manual-account" className="text-xs font-semibold text-zinc-300 mb-1">Account Number</label>
                  <div className="relative w-full">
                    <input
                      id="manual-account"
                      type={showAccountNum ? 'text' : 'password'}
                      required
                      placeholder="Account number"
                      value={manualAccountNum}
                      onChange={(e) => setManualAccountNum(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-primary-500 text-white placeholder-zinc-650 rounded-lg text-xs px-3 py-2 pr-9 outline-none transition-all duration-200 focus:ring-1 focus:ring-primary-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccountNum(!showAccountNum)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-350 transition-colors cursor-pointer outline-none"
                    >
                      {showAccountNum ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setManualMode(false)}
                  className="text-xs font-semibold px-4 py-2 rounded-lg border border-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer outline-none"
                >
                  Back
                </button>
                <BrutalistButton
                  variant="primary"
                  type="submit"
                  className="text-xs font-semibold px-4 py-2"
                >
                  Link Account Manually
                </BrutalistButton>
              </div>

            </form>
          )}

        </div>
      </VoraModal>

    </div>
  );
}

export default function FinancialSettings() {
  return (
    <SettingsErrorBoundary>
      <FinancialSettingsContent />
    </SettingsErrorBoundary>
  );
}
