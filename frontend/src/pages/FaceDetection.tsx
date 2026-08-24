import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  UserPlus,
  Scan,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
  User,
  Shield,
} from 'lucide-react';
import {
  detectOperatorFace,
  registerOperatorFace,
  verifyOperatorFace,
  getRegisteredOperators,
} from '../services/api';
import {
  FaceDetectionResponse,
  FaceVerificationResponse,
  Operator,
} from '../types/api';
import { SeverityBadge } from '../components/common/Severity';

export const FaceDetection: React.FC = () => {
  // Tabs: 'verify' | 'register'
  const [activeTab, setActiveTab] = useState<'verify' | 'register'>('verify');
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loadingOperators, setLoadingOperators] = useState<boolean>(true);

  // Verification state
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyPreview, setVerifyPreview] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<FaceVerificationResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Registration state
  const [regName, setRegName] = useState<string>('');
  const [regId, setRegId] = useState<string>('');
  const [regFile, setRegFile] = useState<File | null>(null);
  const [regPreview, setRegPreview] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [regMessage, setRegMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const verifyInputRef = useRef<HTMLInputElement>(null);
  const regInputRef = useRef<HTMLInputElement>(null);

  const fetchOperators = async () => {
    try {
      const list = await getRegisteredOperators();
      setOperators(list || []);
    } catch (err) {
      console.error('Failed to load registered operators:', err);
    } finally {
      setLoadingOperators(false);
    }
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  const handleVerifyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVerifyFile(file);
      setVerifyPreview(URL.createObjectURL(file));
      setVerifyResult(null);
      setVerifyError(null);
    }
  };

  const handleRunVerify = async () => {
    if (!verifyFile) {
      setVerifyError('Please upload an image to verify.');
      return;
    }
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const res = await verifyOperatorFace(verifyFile);
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyError(err.response?.data?.detail || err.message || 'Face verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRegFile(file);
      setRegPreview(URL.createObjectURL(file));
      setRegMessage(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regFile) {
      setRegMessage({ type: 'error', text: 'Operator name and facial photograph are required.' });
      return;
    }
    setIsRegistering(true);
    setRegMessage(null);
    try {
      const res = await registerOperatorFace(regName, regFile, regId.trim() || undefined);
      setRegMessage({ type: 'success', text: `Operator '${regName}' registered successfully!` });
      setRegName('');
      setRegId('');
      setRegFile(null);
      setRegPreview(null);
      fetchOperators();
    } catch (err: any) {
      setRegMessage({ type: 'error', text: err.response?.data?.detail || 'Registration failed' });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2DFD7]">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-accent" />
            Operator Face Detection & Safety Authentication
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            YOLO11n Face Engine, Template Vectorization & 1:N Safety Authorization
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-[#F0EFEA] p-1.5 rounded-2xl border border-[#E2DFD7] font-mono text-xs">
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'verify'
                ? 'bg-accent text-white shadow-paper'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1:N VERIFICATION
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'register'
                ? 'bg-accent text-white shadow-paper'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            REGISTER OPERATOR
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (7 Cols): Active Tab Form / Verification Tool */}
        <div className="lg:col-span-7 space-y-4">
          {activeTab === 'verify' ? (
            <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-6 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2DFD7]">
                <span className="font-bold uppercase text-slate-800 flex items-center gap-2 font-display text-sm">
                  <Scan className="w-4 h-4 text-accent" />
                  Operator Face Verification Terminal
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">1:N TEMPLATE MATCH</span>
              </div>

              {/* Upload Preview Container */}
              <div className="w-full aspect-[4/3] bg-[#F8F7F4] rounded-2xl border border-[#E2DFD7] relative overflow-hidden flex items-center justify-center shadow-inner">
                {verifyResult && verifyResult.annotated_image_base64 ? (
                  <img src={verifyResult.annotated_image_base64} alt="Verified Face" className="w-full h-full object-contain" />
                ) : verifyPreview ? (
                  <img src={verifyPreview} alt="Face Upload" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-6 text-slate-400 space-y-2">
                    <User className="w-12 h-12 mx-auto text-slate-300" />
                    <div className="font-semibold font-display text-slate-600">No Operator Image Loaded</div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      Upload an operator photograph to verify against registered biometric database.
                    </div>
                  </div>
                )}

                {isVerifying && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                    <div className="text-xs font-bold text-accent">MATCHING AGAINST DATABASE...</div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <input
                  type="file"
                  ref={verifyInputRef}
                  onChange={handleVerifyFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => verifyInputRef.current?.click()}
                  className="flex items-center gap-2 bg-[#F8F7F4] hover:bg-[#F0EFEA] text-slate-700 border border-[#E2DFD7] px-4 py-2.5 rounded-xl font-semibold transition"
                >
                  <Upload className="w-4 h-4 text-accent" />
                  SELECT OPERATOR PHOTO
                </button>

                <button
                  onClick={handleRunVerify}
                  disabled={!verifyFile || isVerifying}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold tracking-wide transition shadow-paper"
                >
                  <UserCheck className="w-4 h-4" />
                  VERIFY IDENTITY
                </button>
              </div>

              {verifyError && (
                <div className="p-3 rounded-xl bg-critical-light border border-critical-border text-critical flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-critical" />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Verification Results Panel */}
              {verifyResult && (
                <div className="p-5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">VERIFICATION OUTCOME</span>
                    <span className="text-[10px] text-slate-500 data-readout">{verifyResult.latency_ms} ms</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold font-display text-slate-900">
                        {verifyResult.identity}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {verifyResult.match_found ? `Operator ID: ${verifyResult.operator_id}` : 'Unrecognized Person'}
                      </div>
                    </div>
                    <div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                          verifyResult.match_found
                            ? 'bg-normal-light text-normal border-normal-border'
                            : 'bg-critical-light text-critical border-critical-border'
                        }`}
                      >
                        {verifyResult.match_found ? 'MATCH CONFIRMED' : 'NO MATCH'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 pt-2 border-t border-[#E2DFD7] font-mono">
                    Cosine Confidence: <span className="font-bold text-accent data-readout">{verifyResult.confidence}%</span> | Database pool: {verifyResult.database_size} registered operators
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-6 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2DFD7]">
                <span className="font-bold uppercase text-slate-800 flex items-center gap-2 font-display text-sm">
                  <UserPlus className="w-4 h-4 text-accent" />
                  Register New Plant Operator
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">SECURE LOCAL ENCLAVE</span>
              </div>

              {regMessage && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    regMessage.type === 'success'
                      ? 'bg-normal-light text-normal border-normal-border'
                      : 'bg-critical-light text-critical border-critical-border'
                  }`}
                >
                  {regMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{regMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Operator Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl px-3.5 py-2 text-slate-900 focus:outline-accent font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Operator ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. OP-014"
                    value={regId}
                    onChange={(e) => setRegId(e.target.value)}
                    className="w-full bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl px-3.5 py-2 text-slate-900 focus:outline-accent"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Reference Portrait Photograph *</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={regInputRef}
                      onChange={handleRegFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => regInputRef.current?.click()}
                      className="flex items-center gap-2 bg-[#F8F7F4] hover:bg-[#F0EFEA] text-slate-700 border border-[#E2DFD7] px-4 py-2.5 rounded-xl font-semibold transition"
                    >
                      <Upload className="w-4 h-4 text-accent" />
                      {regFile ? regFile.name : 'UPLOAD FACE PORTRAIT'}
                    </button>
                    {regPreview && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#E2DFD7]">
                        <img src={regPreview} alt="Thumb" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2DFD7] flex justify-end">
                  <button
                    type="submit"
                    disabled={isRegistering || !regFile || !regName}
                    className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-paper"
                  >
                    {isRegistering ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        REGISTERING...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        REGISTER OPERATOR
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Col (5 Cols): Registered Operators Directory */}
        <div className="lg:col-span-5 bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2DFD7]">
            <span className="font-bold uppercase text-slate-800 flex items-center gap-2 font-display text-sm">
              <User className="w-4 h-4 text-accent" />
              Registered Operators ({operators.length})
            </span>
            <button onClick={fetchOperators} className="text-slate-500 hover:text-accent transition p-1">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {operators.length > 0 ? (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {operators.map((op) => (
                <div key={op.operator_id} className="p-3 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-50 border border-accent-100 flex items-center justify-center text-accent font-bold font-display">
                      {op.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 font-display">{op.name}</div>
                      <div className="text-[10px] text-slate-500">{op.operator_id}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-normal-light text-normal border border-normal-border">
                    VERIFIED
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 font-sans">
              No registered operators found in database.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceDetection;
