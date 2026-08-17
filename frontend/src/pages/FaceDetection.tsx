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

export const FaceDetection: React.FC = () => {
  // Tabs: 'verify' | 'register' | 'detect'
  const [activeTab, setActiveTab] = useState<'verify' | 'register' | 'detect'>('verify');
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sky-600" />
            Model 4: Operator Face Detection & Authentication
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Facial Detection, Template Vectorization & 1:N Identity Verification
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 font-mono text-xs">
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-3 py-1.5 rounded-md font-bold transition ${
              activeTab === 'verify'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1:N VERIFICATION
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`px-3 py-1.5 rounded-md font-bold transition ${
              activeTab === 'register'
                ? 'bg-sky-600 text-white shadow-xs'
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
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="font-bold uppercase text-slate-800 flex items-center gap-2">
                  <Scan className="w-4 h-4 text-sky-600" />
                  Operator Face Verification Terminal
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">1:N TEMPLATE MATCH</span>
              </div>

              {/* Upload Preview Container */}
              <div className="w-full aspect-[4/3] bg-slate-100 rounded-lg border border-slate-300 relative overflow-hidden flex items-center justify-center bg-grid-white shadow-inner">
                {verifyResult && verifyResult.annotated_image_base64 ? (
                  <img src={verifyResult.annotated_image_base64} alt="Verified Face" className="w-full h-full object-contain" />
                ) : verifyPreview ? (
                  <img src={verifyPreview} alt="Face Upload" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-6 text-slate-400 space-y-2">
                    <User className="w-12 h-12 mx-auto text-slate-400" />
                    <div className="font-semibold text-slate-600">No Operator Image Loaded</div>
                    <div className="text-[11px] text-slate-400">
                      Upload an operator photograph to verify against registered biometric database.
                    </div>
                  </div>
                )}

                {isVerifying && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
                    <div className="text-xs font-bold text-sky-800">MATCHING AGAINST DATABASE...</div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <input
                  type="file"
                  ref={verifyInputRef}
                  onChange={handleVerifyFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => verifyInputRef.current?.click()}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg font-semibold transition"
                >
                  <Upload className="w-4 h-4 text-sky-600" />
                  SELECT OPERATOR PHOTO
                </button>

                <button
                  onClick={handleRunVerify}
                  disabled={!verifyFile || isVerifying}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-bold tracking-wide transition shadow-xs"
                >
                  <UserCheck className="w-4 h-4" />
                  VERIFY IDENTITY
                </button>
              </div>

              {verifyError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Verification Results Panel */}
              {verifyResult && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">VERIFICATION OUTCOME</span>
                    <span className="text-[10px] text-slate-500">{verifyResult.latency_ms} ms</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-slate-900">
                        {verifyResult.identity}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {verifyResult.match_found ? `Operator ID: ${verifyResult.operator_id}` : 'Unrecognized Person'}
                      </div>
                    </div>
                    <div>
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold ${
                          verifyResult.match_found
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {verifyResult.match_found ? 'MATCH CONFIRMED' : 'NO MATCH'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-200">
                    Cosine Confidence: <span className="font-bold">{verifyResult.confidence}%</span> | Database pool: {verifyResult.database_size} registered operators
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="font-bold uppercase text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-sky-600" />
                  Register New Plant Operator
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">SECURE LOCAL ENCLAVE</span>
              </div>

              {regMessage && (
                <div
                  className={`p-3 rounded-lg border flex items-center gap-2 ${
                    regMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Operator ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. OP-014"
                    value={regId}
                    onChange={(e) => setRegId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
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
                      className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg font-semibold transition"
                    >
                      <Upload className="w-4 h-4 text-sky-600" />
                      {regFile ? regFile.name : 'UPLOAD FACE PORTRAIT'}
                    </button>
                    {regPreview && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300">
                        <img src={regPreview} alt="Thumb" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <button
                    type="submit"
                    disabled={isRegistering || !regFile || !regName}
                    className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-bold transition shadow-xs"
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
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="font-bold uppercase text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-sky-600" />
              Registered Operators Directory ({operators.length})
            </span>
            <button onClick={fetchOperators} className="text-slate-500 hover:text-sky-600 transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {operators.length > 0 ? (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {operators.map((op) => (
                <div key={op.operator_id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 font-bold">
                      {op.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{op.name}</div>
                      <div className="text-[10px] text-slate-500">{op.operator_id}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                    VERIFIED
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              No registered operators found in database.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
